import { Component, type ReactNode } from 'react';

interface Props {
  fallback: ReactNode;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Catches render/parse errors from inside the `<Canvas>` tree (e.g. a GLB
 * that fails to parse) and swaps to a designed fallback instead of taking
 * the whole route down. This has to be a class component — there is no
 * hooks-based way to catch render errors in React.
 *
 * The mechanism (this file) is frontend-dev's; the actual fallback visual
 * passed in via `fallback` is ui-builder's.
 */
export class CanvasErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    // eslint-disable-next-line no-console
    console.error('[CanvasErrorBoundary] 3D scene failed to render:', error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
