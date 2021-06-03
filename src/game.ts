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
import groundHeightMap from "./assets/heightmaps/villageheightmap.png"
import {SkyMaterial} from "@babylonjs/materials";
import {GrassProceduralTexture} from "@babylonjs/procedural-textures";

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

    const collider = new Mesh('collider', scene);
    collider.visibility = 0;

    // Register a render loop to repeatedly render the scene
    this.engine.runRenderLoop(() => {
      scene.render();
      if (this.isMoving) {
        collider.position = this.xrCamera.position
        const position = this.xrCamera.getFrontPosition(0.1);
        collider.lookAt(position);
        const forwards = new Vector3(Math.sin(collider.rotation.y) / 8, 0, Math.cos(collider.rotation.y) / 8);
        forwards.negate();
        collider.moveWithCollisions(forwards);
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

    const boxTexture = new Texture(wallTexture, scene);
    boxTexture.vScale = 2;
    boxTexture.uScale = 1;
    boxMat.diffuseTexture = boxTexture;

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

    // Create large ground for valley environment
    const largeGroundMat = new StandardMaterial("largeGroundMat", scene);
    largeGroundMat.ambientTexture = new GrassProceduralTexture("grassTexture", 5000, scene);

    const largeGround = MeshBuilder.CreateGroundFromHeightMap(
      "largeGround", groundHeightMap,
      {width: 500, height: 500, subdivisions: 100, minHeight: 0, maxHeight: 8});
    largeGround.material = largeGroundMat;
    largeGround.checkCollisions = true;


    const skyboxMaterial = new SkyMaterial("skyMaterial", scene);
    skyboxMaterial.inclination = 0.2;
    skyboxMaterial.azimuth = 0.19;
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.rayleigh = 2;

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
            console.log('ids: ' + xr_ids);
            const triggerComponent = motionController.getComponent(xr_ids[0]);//xr-standard-trigger
            triggerComponent.onButtonStateChangedObservable.add(() => {
              console.log("squeeze");
              this.isMoving = triggerComponent.pressed;
            });
            const triggerComponent2 = motionController.getComponent(xr_ids[2]);//xr-standard-trigger
            triggerComponent2.onButtonStateChangedObservable.add(() => {
              console.log("select");
              this.isMoving = triggerComponent2.pressed;
            });
          }
        });
      });
    })

    return scene;
  }
}
