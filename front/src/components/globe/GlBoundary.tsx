import { Component, type ReactNode } from 'react';

type Props = { onError: () => void; children: ReactNode };

/** Any error from the 3D canvas (no GL context, shader failure) switches the globe to the static picture. */
export class GlBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
