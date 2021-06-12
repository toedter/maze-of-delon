import {
  Color3,
  DirectionalLight,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  ShadowGenerator,
  StandardMaterial,
  Texture,
  Vector3
} from "@babylonjs/core";

import amazer, {AmazerBuilder, Area, Emmure, RandomizedPrim} from "amazer";

import wallTexture from "./assets/textures/floor.png"
import groundHeightMap from "./assets/heightmaps/villageheightmap.png"
import {SkyMaterial} from "@babylonjs/materials";
import {GrassProceduralTexture} from "@babylonjs/procedural-textures";
import {FireBall} from "./fireball";
import {Fountain} from "./fountain";
import {Player} from "./player";

export class Game {
  private readonly canvas: HTMLCanvasElement;
  private readonly engine: Engine;
  private maze!: Area;

  constructor() {
    this.canvas = <HTMLCanvasElement>document.getElementById("renderCanvas");
    this.engine = new Engine(this.canvas, true);
    const scene = this.createScene();

    const divFps = document.getElementById("fps");

    // Register a render loop to repeatedly render the scene
    scene.executeWhenReady(() => {
      this.engine.runRenderLoop(() => {
        scene.render();
        if (divFps) {
          divFps.innerHTML = this.engine.getFps().toFixed() + " fps";
        }
      })
    });

    window.addEventListener("resize", () => {
      this.engine.resize();
    });
  }

  createScene(): Scene {
    const scene = new Scene(this.engine);
    scene.collisionsEnabled = true;
    scene.gravity = new Vector3(0, -0.9, 0);

    const mazeSize = 35;
    const mazeCellSize = 5;

    new Player(scene, this.canvas, mazeSize);

    // this.camera.position = new Vector3(0, 300, 0);
    // this.camera.target = new Vector3(0, 0, 1);

    const light = new HemisphericLight("light", new Vector3(-1, 1, 0), scene);
    light.intensity = 0.8;

    const shadowGenerator = this.getShadowGenerator(scene);

    const boxMat = new StandardMaterial("boxMat", scene);
    const boxTexture = new Texture(wallTexture, scene);
    boxTexture.vScale = 1;
    boxTexture.uScale = 1;
    boxMat.diffuseTexture = boxTexture;
    boxMat.specularColor = new Color3(0.2, 0.2, 0.2);

    const mazeConfig = (<AmazerBuilder>amazer()).withSize({width: mazeSize, height: mazeSize})
      .using(RandomizedPrim)
      .andModifier(Emmure)
      .build();
    this.maze = amazer(mazeConfig).generate();

    const boxes: Mesh[] = [];
    for (let x = 0; x < (mazeSize + 2); x++) {
      for (let y = 0; y < (mazeSize + 2); y++) {
        if (!(x <= (mazeSize / 2 + 2) && x > mazeSize / 2 && y === 0)) {
          if(!(x === (mazeSize+1)/2 && y === (mazeSize+1)/2))       {
            if (this.maze.tiles[x][y].name === 'Wall') {
              const box = MeshBuilder.CreateBox("box",
                {width: mazeCellSize, height: mazeCellSize * 2, depth: mazeCellSize}, scene);
              box.position.y = mazeCellSize;
              box.position.x = x * mazeCellSize - 100;
              box.position.z = y * mazeCellSize - 90;
              box.material = boxMat;
              box.checkCollisions = true;
              boxes.push(box);
              // shadowGenerator.addShadowCaster(box);
            }
          }
        }
      }
    }
    const mazeMesh = Mesh.MergeMeshes(boxes);
    if (mazeMesh) {
      shadowGenerator.addShadowCaster(mazeMesh);
    }

    // Create large ground for valley environment
    const largeGroundMat = new StandardMaterial("largeGroundMat", scene);
    largeGroundMat.ambientTexture = new GrassProceduralTexture("grassTexture", 5000, scene);
    largeGroundMat.specularColor = new Color3(0.2, 0.2, 0.2);

    const largeGround = MeshBuilder.CreateGroundFromHeightMap(
      "largeGround", groundHeightMap,
      {width: 500, height: 500, subdivisions: 100, minHeight: 0, maxHeight: 8});
    largeGround.material = largeGroundMat;
    largeGround.checkCollisions = true;
    largeGround.receiveShadows = true;


    const skyboxMaterial = new SkyMaterial("skyMaterial", scene);
    skyboxMaterial.inclination = 0.2;
    skyboxMaterial.azimuth = 0.19;
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.rayleigh = 2;

    // Sky mesh (box)
    const skybox = Mesh.CreateBox("skyBox", 1000.0, scene);
    skybox.material = skyboxMaterial;

    FireBall.createFireballs(this.maze, 5, shadowGenerator, scene);

    const fountainX = (mazeSize+1)/2 * mazeCellSize - 100;
    const fountainZ = (mazeSize+1)/2 * mazeCellSize - 90;
    new Fountain(scene, new Vector3(fountainX, 0, fountainZ) );

    // // hide/show the Inspector
    // window.addEventListener("keydown", (event) => {
    //   // Shift+Ctrl+Alt
    //   if (event.shiftKey && event.ctrlKey && event.altKey) {
    //     if (scene.debugLayer.isVisible()) {
    //       scene.debugLayer.hide();
    //     } else {
    //       scene.debugLayer.show();
    //     }
    //   }
    // });
    // scene.debugLayer.show({
    //   embedMode: true,
    // });

    return scene;
  }

  private getShadowGenerator(scene: Scene): ShadowGenerator {
    const light = new DirectionalLight("directional light", new Vector3(-0.2, -1, -0.2), scene);
    light.position = new Vector3(-8, 50, 0);
    light.intensity = 1.5;

    // const lightSphere = Mesh.CreateSphere("sphere", 10, 2, scene);
    // lightSphere.position = light.position;
    // lightSphere.material = new StandardMaterial("light", scene);

    const shadowGenerator = new ShadowGenerator(1000, light);
    shadowGenerator.useExponentialShadowMap = true;
    shadowGenerator.useContactHardeningShadow = true;
    shadowGenerator.contactHardeningLightSizeUVRatio = 0.0075;

    return shadowGenerator;
  }
}
