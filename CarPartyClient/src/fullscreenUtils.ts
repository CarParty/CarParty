// it's a depressing story -> https://caniuse.com/fullscreen
// sorry, iOS users and maybe sorry iPadOS users
// I would like to use the Promise-return value, but I'm too scared of Safari on Mac

export function toggleFullScreen(): void {
  if (document.fullscreenElement || (document as any).mozFullScreenElement || (document as any).webkitFullscreenElement) {
    requestFullscreen();
  } else {
    requestFullscreen();
  }
}

export function requestFullscreen(): void {
  if (!document.fullscreenElement && !(document as any).mozFullScreenElement && !(document as any).webkitFullscreenElement) {
    if (document.documentElement.requestFullscreen) {
      // if a browser supports the standard, jay!
      document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    } else if ((document.documentElement as any).mozRequestFullScreen) {
      // and now trick our type checker with the hope of persuading more browsers : (
      (document.documentElement as any).mozRequestFullScreen();
    } else if ((document.documentElement as any).webkitRequestFullscreen) {
      (document.documentElement as any).webkitRequestFullscreen();
    }
  }
}

export function exitFullscreen(): void {
  if (document.fullscreenElement || (document as any).mozFullScreenElement || (document as any).webkitFullscreenElement) {
    if (document.exitFullscreen) {
      document.exitFullscreen(); // that's the standard
    } else if ((document as any).mozCancelFullScreen) {
      (document as any).mozCancelFullScreen(); // and that's me being hopeful
    } else if ((document as any).webkitCancelFullScreen) {
      (document as any).webkitCancelFullScreen();
    }
  }
}
