import {
  Engine,
  FreeCamera,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Texture,
  Vector3,
  WebXRCamera
} from "@babylonjs/core";

import amazer, {AmazerBuilder, Area, Emmure, RandomizedPrim} from "amazer";

import wallTexture from "./assets/textures/floor.png"
import {SkyMaterial} from "@babylonjs/materials";

export class Game {
  private readonly canvas: HTMLCanvasElement;
  private readonly engine: Engine;

  private isMoving = false;
  private xrCamera!: WebXRCamera;
  private camera!: FreeCamera;

  constructor() {
    this.canvas = <HTMLCanvasElement>document.getElementById("renderCanvas");
    this.engine = new Engine(this.canvas, true);
    const scene = this.createScene();

    // Register a render loop to repeatedly render the scene
    this.engine.runRenderLoop(() => {
      scene.render();
      if (this.isMoving) {
        this.xrCamera.position = this.xrCamera.getFrontPosition(0.1);
      }
    });

    window.addEventListener("resize", () => {
      this.engine.resize();
    });
  }

  createScene(): Scene {
    const scene = new Scene(this.engine);
    scene.collisionsEnabled = true;
    scene.gravity = new Vector3(0, -0.9, 0);

    const mazeSize = 45;
    const camera = new FreeCamera("playerCamera", new Vector3(mazeSize, 2, -(mazeSize + 20)), scene);
    camera.checkCollisions = true;
    camera.minZ = .01;
    camera.ellipsoid = new Vector3(1, 1, 1);
    camera.applyGravity = true;
    camera.attachControl(this.canvas, true);
    this.camera = camera;

    new HemisphericLight("light", new Vector3(-1, 1, 0), scene);

    const boxMat = new StandardMaterial("boxMat", scene);
    boxMat.diffuseTexture = new Texture(wallTexture, scene);

    const mazeConfig = (<AmazerBuilder>amazer()).withSize({width: mazeSize, height: mazeSize})
      .using(RandomizedPrim)
      .andModifier(Emmure)
      .build();
    const area: Area = amazer(mazeConfig).generate();

    for (let i = 0; i < (mazeSize + 2); i++) {
      for (let y = 0; y < (mazeSize + 2); y++) {
        if (!(i <= 23 && i > 21 && y === 0)) {
          if (area.tiles[i][y].name === 'Wall') {
            const box = MeshBuilder.CreateBox("box", {width: 4, height: 10, depth: 4});
            box.position.y = 5;
            box.position.x = i * 4 - 45;
            box.position.z = y * 4 - 45;
            box.material = boxMat;
            box.checkCollisions = true;
          }
        }
      }
    }

    //const ground = MeshBuilder.CreateGround("ground", {width: 100, height: 100});
    //Create large ground for valley environment
    const largeGroundMat = new StandardMaterial("largeGroundMat", scene);
    largeGroundMat.diffuseTexture = new Texture("https://assets.babylonjs.com/environments/valleygrass.png", scene);

    const largeGround = MeshBuilder.CreateGroundFromHeightMap(
      "largeGround", "https://assets.babylonjs.com/environments/villageheightmap.png",
      {width: 500, height: 500, subdivisions: 100, minHeight: 0, maxHeight: 8});
    largeGround.material = largeGroundMat;
    largeGround.checkCollisions = true;


    const skyboxMaterial = new SkyMaterial("skyMaterial", scene);
    skyboxMaterial.inclination = 0;
    skyboxMaterial.backFaceCulling = false;

    // Sky mesh (box)
    const skybox = Mesh.CreateBox("skyBox", 1000.0, scene);
    skybox.material = skyboxMaterial;

    scene.createDefaultXRExperienceAsync({
      floorMeshes: [largeGround]
    }).then((xr) => {
      this.xrCamera = xr.input.xrCamera;
      // const fm = xr.baseExperience.featuresManager;
      // fm.disableFeature(WebXRMotionControllerTeleportation.Name);

      xr.input.onControllerAddedObservable.add((controller) => {
        controller.onMotionControllerInitObservable.add((motionController) => {
          if (motionController.handness === 'right') {
            const xr_ids = motionController.getComponentIds();
            const triggerComponent = motionController.getComponent(xr_ids[0]);//xr-standard-trigger
            triggerComponent.onButtonStateChangedObservable.add(() => {
              this.isMoving = triggerComponent.pressed;
            });
          }
        });
      });
    })

    return scene;
  }
}
