import {ILoadingScreen} from "@babylonjs/core";

export class LoadingScreen implements ILoadingScreen {
  private loadingScreenDiv: HTMLElement | null;
  private fps: HTMLElement | null;

  constructor(public loadingUIText: string) {
    this.loadingScreenDiv = window.document.getElementById("loadingScreen");
    this.fps = window.document.getElementById("fps");
  }

  public displayLoadingUI(): void {
    if (this.loadingScreenDiv && this.fps) {
      this.loadingScreenDiv.innerHTML = this.loadingUIText;
      this.fps.style.display = "none";
    }
  }

  public hideLoadingUI(): void {
    if (this.loadingScreenDiv && this.fps) {
      this.fps.style.display = "block";
      this.loadingScreenDiv.style.display = "none";
    }
  }

  loadingUIBackgroundColor = '#aabbcc';
}
