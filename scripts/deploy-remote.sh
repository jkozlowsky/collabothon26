#!/usr/bin/env bash
# Finance Quest production deploy / rollback for the Oracle Linux 9 host.
#
# Installed root-owned (0755) at /usr/local/sbin/financequest-deploy. CI runs it as the
# `deploy` user through a sudoers rule that allows any arguments, so every argument and
# every file in the staging directory is untrusted input:
#   - the staging path must be /home/deploy/staging-<id>,
#   - staging content is first copied into a root-only work dir without following
#     symlinks, then validated there, and only the validated copy is installed,
#   - all release directories are root-owned, so `deploy` cannot plant symlinks where
#     this script writes.
# The script never reads /etc/financequest/env.
#
# Usage:
#   financequest-deploy --staging /home/deploy/staging-<id> [--dry-run]
#   financequest-deploy --rollback       # swap current and previous release (run again to undo)
#   financequest-deploy --health-check

set -euo pipefail
umask 022
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
export LC_ALL=C

readonly STAGING_PATTERN='^/home/deploy/staging-[A-Za-z0-9-]{1,80}$'
readonly BACK_DIR=/opt/financequest
readonly BACK_RELEASES=$BACK_DIR/releases
readonly BACK_JAR=$BACK_DIR/back.jar
readonly BACK_JAR_PREV=$BACK_DIR/back.jar.prev
readonly WEB_DIR=/srv/financequest
readonly WEB_RELEASES=$WEB_DIR/releases
readonly WEB_ACTIVE=$WEB_DIR/web
readonly WEB_PREV=$WEB_DIR/web.prev
readonly SERVICE=financequest.service
readonly HEALTH_URL=http://127.0.0.1:8080/api/lessons
readonly KEEP_RELEASES=5
# /srv/financequest has no fcontext rule (default var_t), and Caddy runs confined as
# httpd_t, so web files must carry this type explicitly. Never `restorecon` /srv here.
readonly WEB_SELINUX_TYPE=httpd_sys_content_t
readonly MIN_JAR_BYTES=1000000

MODE=""
STAGING_DIR=""
DRY_RUN=false
WORK_DIR=""

die() { echo "Error: $*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Usage:
  financequest-deploy --staging /home/deploy/staging-<id> [--dry-run]
  financequest-deploy --rollback
  financequest-deploy --health-check
EOF
  exit "${1:-1}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --staging)
      [[ $# -ge 2 ]] || usage 1
      MODE=deploy
      STAGING_DIR=$2
      shift 2
      ;;
    --rollback) MODE=rollback; shift ;;
    --health-check) MODE=health-check; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    -h|--help) usage 0 ;;
    *) echo "Unknown option" >&2; usage 1 ;;
  esac
done
[[ -n "$MODE" ]] || usage 1

[[ $EUID -eq 0 ]] || die "must run as root (sudo)."

# One deploy/rollback at a time.
exec 9>/run/financequest-deploy.lock
flock -n 9 || die "another deploy or rollback is running."

cleanup() {
  if [[ -n "$WORK_DIR" && -d "$WORK_DIR" ]]; then
    rm -rf -- "$WORK_DIR"
  fi
}
trap cleanup EXIT

selinux_on() { command -v selinuxenabled >/dev/null 2>&1 && selinuxenabled; }

# Atomically point symlink $2 at $1.
swap_symlink() {
  local target=$1 link=$2
  rm -f -- "$link.tmp"
  ln -sn -- "$target" "$link.tmp"
  if selinux_on; then chcon -h -t "$WEB_SELINUX_TYPE" -- "$link.tmp"; fi
  mv -Tf -- "$link.tmp" "$link"
}

# Atomically replace file $2 with a root-owned 0644 copy of $1.
install_file() {
  local src=$1 dest=$2
  rm -f -- "$dest.tmp"
  install -m 0644 -o root -g root -- "$src" "$dest.tmp"
  mv -f -- "$dest.tmp" "$dest"
}

# Release directories must be real, root-owned directories: this script writes into them.
ensure_dirs() {
  local d
  for d in "$BACK_DIR" "$WEB_DIR" "$BACK_RELEASES" "$WEB_RELEASES"; do
    [[ ! -L "$d" ]] || die "$d is a symlink."
    mkdir -p -- "$d"
    chown root:root -- "$d"
    chmod 0755 -- "$d"
  done
  if selinux_on; then chcon -t "$WEB_SELINUX_TYPE" -- "$WEB_RELEASES"; fi
}

run_health_check() {
  local code="" i
  echo "==> Health check: $HEALTH_URL"
  for ((i = 1; i <= 30; i++)); do
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$HEALTH_URL" || true)
    if [[ "$code" == "200" ]]; then
      echo "Backend healthy (HTTP 200) after $i attempt(s)."
      return 0
    fi
    sleep 2
  done
  echo "Backend health check failed (last HTTP status: ${code:-none})." >&2
  systemctl status "$SERVICE" --no-pager --lines=0 >&2 || true
  journalctl -u "$SERVICE" -n 30 --no-pager -o cat >&2 || true
  return 1
}

# Copy staging into a root-only work dir without following symlinks, then validate the copy.
stage_payload() {
  [[ "$STAGING_DIR" =~ $STAGING_PATTERN ]] || die "staging path must match /home/deploy/staging-<id>."
  [[ -d "$STAGING_DIR" && ! -L "$STAGING_DIR" ]] || die "staging directory missing or a symlink."

  WORK_DIR=$(mktemp -d /var/tmp/financequest-deploy.XXXXXX)
  cp -RP --no-preserve=all -- "$STAGING_DIR/back.jar" "$STAGING_DIR/web" "$WORK_DIR/" \
    || die "staging must contain back.jar and web/."

  local jar=$WORK_DIR/back.jar web=$WORK_DIR/web
  [[ -f "$jar" && ! -L "$jar" ]] || die "back.jar is not a regular file."
  [[ -d "$web" && ! -L "$web" ]] || die "web/ is not a directory."
  [[ -f "$web/index.html" ]] || die "web/index.html missing."
  if [[ -n "$(find "$WORK_DIR" ! -type f ! -type d -print -quit)" ]]; then
    die "staging contains symlinks or special files."
  fi

  local size
  size=$(stat -c %s -- "$jar")
  (( size >= MIN_JAR_BYTES )) || die "back.jar is suspiciously small ($size bytes)."
  [[ "$(head -c 2 -- "$jar")" == "PK" ]] || die "back.jar is not a jar/zip file."
}

# Delete old releases matching $2 in $1, newest $KEEP_RELEASES kept, never $3 or $4.
prune() {
  local dir=$1 glob=$2 keep_a=${3:-} keep_b=${4:-} path
  find "$dir" -mindepth 1 -maxdepth 1 -name "$glob" -printf '%T@\t%p\0' \
    | sort -z -rn | tail -z -n +$((KEEP_RELEASES + 1)) | cut -z -f2- \
    | while IFS= read -r -d '' path; do
        [[ "$path" == "$keep_a" || "$path" == "$keep_b" ]] && continue
        rm -rf -- "$path"
      done
}

do_deploy() {
  stage_payload
  if [[ "$DRY_RUN" == true ]]; then
    echo "[dry run] Staging payload is valid. No changes made."
    return 0
  fi

  ensure_dirs
  local id release_jar release_web prev_web=""
  id=$(date -u +%Y%m%dT%H%M%SZ)
  release_jar=$BACK_RELEASES/back-$id.jar
  release_web=$WEB_RELEASES/web-$id
  [[ ! -e "$release_jar" && ! -e "$release_web" ]] || die "release $id already exists."

  echo "==> Preparing release $id"
  install -m 0644 -o root -g root -- "$WORK_DIR/back.jar" "$release_jar"
  cp -RP --no-preserve=all -- "$WORK_DIR/web" "$release_web"
  chown -R root:root -- "$release_web"
  find "$release_web" -type d -exec chmod 0755 {} +
  find "$release_web" -type f -exec chmod 0644 {} +
  if selinux_on; then chcon -R -t "$WEB_SELINUX_TYPE" -- "$release_web"; fi

  # Remember the current release as the previous one.
  if [[ -f "$BACK_JAR" ]]; then install_file "$BACK_JAR" "$BACK_JAR_PREV"; fi
  if [[ -L "$WEB_ACTIVE" ]]; then
    prev_web=$(readlink -f -- "$WEB_ACTIVE")
  elif [[ -d "$WEB_ACTIVE" ]]; then
    # First run on the legacy layout: a plain directory becomes a release.
    prev_web=$WEB_RELEASES/web-legacy-$id
    mv -T -- "$WEB_ACTIVE" "$prev_web"
  fi
  if [[ -n "$prev_web" && -d "$prev_web" ]]; then swap_symlink "$prev_web" "$WEB_PREV"; fi

  echo "==> Switching to release $id"
  install_file "$release_jar" "$BACK_JAR"
  swap_symlink "$release_web" "$WEB_ACTIVE"

  echo "==> Restarting $SERVICE"
  systemctl restart "$SERVICE"
  if ! run_health_check; then
    echo "==> Deploy failed its health check, rolling back to the previous release." >&2
    if [[ -f "$BACK_JAR_PREV" ]]; then install_file "$BACK_JAR_PREV" "$BACK_JAR"; fi
    if [[ -n "$prev_web" && -d "$prev_web" ]]; then swap_symlink "$prev_web" "$WEB_ACTIVE"; fi
    systemctl restart "$SERVICE"
    run_health_check || echo "Rollback is unhealthy too: needs manual attention." >&2
    exit 1
  fi

  prune "$BACK_RELEASES" 'back-*.jar'
  prune "$WEB_RELEASES" 'web-*' "$release_web" "$prev_web"
  echo "Deployed release $id."
}

do_rollback() {
  ensure_dirs
  [[ -f "$BACK_JAR_PREV" ]] || die "no previous backend jar at $BACK_JAR_PREV."
  local cur_web="" prev_web=""
  if [[ -L "$WEB_ACTIVE" ]]; then cur_web=$(readlink -f -- "$WEB_ACTIVE"); fi
  if [[ -L "$WEB_PREV" ]]; then prev_web=$(readlink -f -- "$WEB_PREV"); fi

  echo "==> Swapping current and previous release"
  WORK_DIR=$(mktemp -d /var/tmp/financequest-deploy.XXXXXX)
  if [[ -f "$BACK_JAR" ]]; then cp -P -- "$BACK_JAR" "$WORK_DIR/current.jar"; fi
  install_file "$BACK_JAR_PREV" "$BACK_JAR"
  if [[ -f "$WORK_DIR/current.jar" ]]; then install_file "$WORK_DIR/current.jar" "$BACK_JAR_PREV"; fi
  if [[ -n "$prev_web" && -d "$prev_web" ]]; then
    swap_symlink "$prev_web" "$WEB_ACTIVE"
    if [[ -n "$cur_web" && -d "$cur_web" ]]; then swap_symlink "$cur_web" "$WEB_PREV"; fi
  else
    echo "Warning: no previous web release; frontend left unchanged." >&2
  fi

  systemctl restart "$SERVICE"
  run_health_check
  echo "Rollback done. Run --rollback again to undo it."
}

case "$MODE" in
  deploy) do_deploy ;;
  rollback) do_rollback ;;
  health-check) run_health_check ;;
esac
