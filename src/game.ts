import {
  ActionManager,
  Engine,
  ExecuteCodeAction,
  FreeCamera,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Texture,
  Vector3,
  Viewport
} from "@babylonjs/core";

import amazer, {AmazerBuilder, Area, Emmure, RandomizedPrim} from "amazer";

import wallTexture from "./assets/textures/floor.png"
import {SkyMaterial} from "@babylonjs/materials";

export class Game {
  private readonly canvas: HTMLCanvasElement;
  private readonly engine: Engine;
  private inputs: any;

  constructor() {
    this.inputs = {};
    this.canvas = <HTMLCanvasElement>document.getElementById("renderCanvas");
    this.engine = new Engine(this.canvas, true);
    const scene = this.createScene();

    // Register a render loop to repeatedly render the scene
    this.engine.runRenderLoop(function () {
      scene.render();
    });

    window.addEventListener("resize", () => {
      this.engine.resize();
    });
  }

  createScene() {
    const scene = new Scene(this.engine);
    scene.collisionsEnabled = true;
    scene.gravity = new Vector3(0, -0.9, 0);

    // const camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 10, Vector3.Zero(), scene);
    // camera.checkCollisions = true;
    // camera.attachControl(this.canvas, true);

    const camera = new FreeCamera("playerCamera", new Vector3(0, 2, 0), scene);
    camera.checkCollisions = true;
    camera.minZ = .01;
    camera.ellipsoid = new Vector3(1, 1, 1);
    camera.applyGravity = true;
    camera.attachControl(this.canvas, true);

    const light = new HemisphericLight("light", new Vector3(-1, 1, 0), scene);

    const boxMat = new StandardMaterial("boxMat", scene);
    boxMat.diffuseTexture = new Texture(wallTexture, scene);

    const mazeSize = 45;
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

    // Players
    //const player1 = this.createPlayer(scene, new Viewport(0, 0, 1, 0.5), ["w", "a", "s", "d"]);

    // Detect and store inputs in dictionary.
    scene.actionManager = new ActionManager(scene);

    scene.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnKeyDownTrigger,
        (e) => this.inputs[e.sourceEvent.key] = e.sourceEvent.type == "keydown"));

    scene.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnKeyUpTrigger,
        (e) => this.inputs[e.sourceEvent.key] = e.sourceEvent.type == "keydown"));

    const xr = scene.createDefaultXRExperienceAsync({
      floorMeshes: [largeGround]
    });

    return scene;
  };

  private createPlayer(scene: Scene, viewport: Viewport, keys: string[]) {
    // Create player sphere the camera will be inside of.
    // let player = Mesh.CreateSphere("playerMesh", 4, 0.5, scene);
    // player.position.y = 1;
    // player.position.z = -70;

    // Create camera as a child of the player.
    const camera = new FreeCamera("playerCamera", new Vector3(0, 1, 0), scene);
    camera.checkCollisions = true;
    camera.ellipsoid = new Vector3(1, 1, 1);
    camera.applyGravity = true;
    camera.attachControl(this.canvas, true);

    //    camera.parent = player;
    // camera.viewport = viewport;
    // scene.activeCameras?.push(camera);

    // Register input to move the player.
    // scene.onBeforeRenderObservable.add((scene, ev) => {
    //   if (this.inputs[keys[0]])
    //     player.locallyTranslate(new Vector3(0, 0, 0.2));
    //   if (this.inputs[keys[2]])
    //     player.locallyTranslate(new Vector3(0, 0, -0.2));
    //   if (this.inputs[keys[1]])
    //     player.rotation.y -= 0.04;
    //   if (this.inputs[keys[3]])
    //     player.rotation.y += 0.04;
    // });
    //
    // return player;
  };

}
