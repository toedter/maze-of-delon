import {
  Animation,
  Camera,
  CircleEase,
  EasingFunction,
  FreeCamera,
  Mesh,
  Scene,
  Vector3,
  WebXRCamera
} from "@babylonjs/core";

export class Player {
  private isMoving = false;
  private xrCamera!: WebXRCamera;
  private camera!: FreeCamera;

  private collider: Mesh;

  constructor(scene: Scene, canvas: HTMLCanvasElement, mazeSize: number) {
    this.collider = new Mesh('collider', scene);
    this.collider.visibility = 0;

    const startPosition = new Vector3(-10, 3, -(mazeSize + 65));
    const camera = new FreeCamera("playerCamera", startPosition, scene);
    camera.checkCollisions = true;
    camera.minZ = 0.01;
    camera.ellipsoid = new Vector3(1, 1.5, 1);
    camera.applyGravity = true;
    camera.speed = 0.2;
    camera.angularSensibility = 10000;
    camera.attachControl(canvas, true);

    this.camera = camera;
    scene.registerBeforeRender(() => this.move());

    scene.createDefaultXRExperienceAsync({
      // uncomment for teleopting navigation
      // floorMeshes: [largeGround]
    }).then((xr) => {
      this.xrCamera = xr.input.xrCamera;
      this.xrCamera.position.y = 3;

      // const fm = xr.baseExperience.featuresManager;
      // fm.disableFeature(WebXRMotionControllerTeleportation.Name);

      xr.input.onControllerAddedObservable.add((controller) => {
        controller.onMotionControllerInitObservable.add((motionController) => {
          if (motionController.handness === 'right') {
            const xr_ids = motionController.getComponentIds();
            const triggerComponent = motionController.getComponent(xr_ids[0]); // xr-standard-trigger
            triggerComponent.onButtonStateChangedObservable.add(() => {
              this.isMoving = triggerComponent.pressed;
            });
            const triggerComponent2 = motionController.getComponent(xr_ids[3]); // a button
            triggerComponent2.onButtonStateChangedObservable.add(() => {
              if (triggerComponent2.pressed) {
                this.cameraJump(scene, this.xrCamera, 50);
              } else {
                this.cameraJump(scene, this.xrCamera, -50);
              }
            });
          }
        });
      });
    })

    window.addEventListener("keydown", (event) => {
      switch (event.code) {
        case 'Space':
          this.cameraJump(scene, camera, 200);
          break;
      }
    }, false);

    window.addEventListener("keyup", (event) => {
      switch (event.code) {
        case 'Space':
          this.cameraJump(scene, camera, -200);
          break;
      }
    }, false);
  }

  private move() {
    if (this.isMoving) {
      this.collider.position = this.xrCamera.position
      const position = this.xrCamera.getFrontPosition(0.1);
      this.collider.lookAt(position);
      const forwards = new Vector3(
        Math.sin(this.collider.rotation.y) / 8,
        0,
        Math.cos(this.collider.rotation.y) / 8);
      forwards.negate();
      this.collider.moveWithCollisions(forwards);
    }
  }

  private cameraJump(scene: Scene, camera: Camera, direction: number) {
    camera.animations = [];

    const animation: Animation = new Animation(
      "camera jump animation",
      "position.y", 20,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CYCLE);

    const keys = [];
    keys.push({frame: 0, value: camera.position.y});
    keys.push({frame: 10, value: camera.position.y + direction});

    animation.setKeys(keys);

    const easingFunction = new CircleEase();
    easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
    animation.setEasingFunction(easingFunction);

    camera.animations.push(animation);

    scene.beginAnimation(camera, 0, 20, false);
  }
}
