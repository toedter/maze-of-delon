import {
  Color3,
  DirectionalLight,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene, SceneOptimizer,
  ShadowGenerator,
  StandardMaterial,
  Texture,
  Vector3,
  WebXRCamera
} from "@babylonjs/core";

import amazer, {AmazerBuilder, Area, Emmure, RandomizedPrim} from "amazer";

import groundTexture from "./assets/textures/ground.jpg"
import wallTexture from "./assets/textures/wall.png"
import wallBumpTexture from "./assets/textures/wall-bump.png"
import groundHeightMap from "./assets/heightmaps/villageheightmap.png"
import {SkyMaterial} from "@babylonjs/materials";
import {GrassProceduralTexture} from "@babylonjs/procedural-textures";
import {FireBall} from "./fireball";
import {Fountain} from "./fountain";
import {Player} from "./player";
import {Button3D, GUI3DManager, StackPanel3D, TextBlock} from "@babylonjs/gui";
import {LoadingScreen} from "./loading-screen";

export enum State { START = 0, GAME = 1, LOSE = 2, WIN = 3 }

export class Game {
  private readonly canvas: HTMLCanvasElement;
  private readonly engine: Engine;
  private maze!: Area;
  private player!: Player;
  private state: State;

  constructor() {
    this.state = State.START;
    this.canvas = <HTMLCanvasElement>document.getElementById("renderCanvas");
    this.engine = new Engine(this.canvas, true);

    const loadingScreen = new LoadingScreen("The Maze of Delon is loading...");
    this.engine.loadingScreen = loadingScreen;
    this.engine.displayLoadingUI();

    const scene = this.createScene();

    const divFps = document.getElementById("fps");

    this.start(scene);
    SceneOptimizer.OptimizeAsync(scene);

    scene.executeWhenReady(() => {
      this.engine.hideLoadingUI();
      this.engine.runRenderLoop(() => {
        scene.render();
        if(this.state === State.LOSE) {
          this.lose(scene);
        }
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
    boxMat.specularColor = new Color3(0.3, 0.3, 0.3);
    const boxBumpTexture = new Texture(wallBumpTexture, scene);
    boxBumpTexture.vScale = 1;
    boxBumpTexture.uScale = 1;
    boxMat.bumpTexture = boxBumpTexture;
    boxMat.invertNormalMapX = true;
    boxMat.invertRefractionY = true;
    // boxMat.invertNormalMapY = true;
    boxMat.maxSimultaneousLights = 7;

    const mazeConfig = (<AmazerBuilder>amazer()).withSize({width: mazeSize, height: mazeSize})
      .using(RandomizedPrim)
      .andModifier(Emmure)
      .build();
    this.maze = amazer(mazeConfig).generate();

    const boxes: Mesh[] = [];
    for (let x = 0; x < (mazeSize + 2); x++) {
      for (let y = 0; y < (mazeSize + 2); y++) {
        if (!(x <= (mazeSize / 2 + 2) && x > mazeSize / 2 && y === 0)) {
          if (!(x === (mazeSize + 1) / 2 && y === (mazeSize + 1) / 2)) {
            if (this.maze.tiles[x][y].name === 'Wall') {
              const box = MeshBuilder.CreateBox("box",
                {width: mazeCellSize, height: mazeCellSize * 2, depth: mazeCellSize}, scene);
              box.position.y = mazeCellSize;
              box.position.x = x * mazeCellSize - 100;
              box.position.z = y * mazeCellSize - 90;
              box.material = boxMat;
              box.checkCollisions = true;
              boxes.push(box);
              // box.receiveShadows = true;
              // shadowGenerator.addShadowCaster(box);
            }
          }
        }
      }
    }
    const mazeMesh = Mesh.MergeMeshes(boxes);
    if (mazeMesh) {
      shadowGenerator.addShadowCaster(mazeMesh);
      // mazeMesh.receiveShadows = true;
      mazeMesh.freezeWorldMatrix();
    }

    // Create large ground for valley environment
    const largeGroundMat = new StandardMaterial("largeGroundMat", scene);
    largeGroundMat.ambientTexture = new GrassProceduralTexture("grassTexture", 5000, scene);
    largeGroundMat.specularColor = new Color3(0.1, 0.1, 0.1);

    const largeGround = MeshBuilder.CreateGroundFromHeightMap(
      "largeGround", groundHeightMap,
      {width: 500, height: 500, subdivisions: 100, minHeight: 0, maxHeight: 8});
    largeGround.material = largeGroundMat;

    const groundMaterial = new StandardMaterial("ground", scene);
    groundMaterial.diffuseTexture = new Texture(groundTexture, scene);
    (groundMaterial.diffuseTexture as Texture).uScale = 30;
    (groundMaterial.diffuseTexture as Texture).vScale = 30;
    groundMaterial.specularColor = new Color3(0, 0, 0);

    largeGround.material = groundMaterial;

    largeGround.checkCollisions = true;
    largeGround.receiveShadows = true;


    const skyboxMaterial = new SkyMaterial("skyMaterial", scene);
    skyboxMaterial.inclination = 0.1;
    skyboxMaterial.azimuth = 0.09;
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.rayleigh = 2;

    const skybox = Mesh.CreateBox("skyBox", 1000.0, scene);
    skybox.material = skyboxMaterial;

    FireBall.createFireballs(this.maze, 5, shadowGenerator, scene, this);

    const fountainX = (mazeSize + 1) / 2 * mazeCellSize - 100;
    const fountainZ = (mazeSize + 1) / 2 * mazeCellSize - 90;
    const fountain = new Fountain(scene, new Vector3(fountainX, 0, fountainZ));

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

    this.player = new Player(scene, this.canvas, mazeSize, fountain, this);

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


  start(scene: Scene): void {
    this.state = State.START;
    this.player.resetToStartPosition();

    const manager = new GUI3DManager(scene);
    const panel = new StackPanel3D();

    manager.addControl(panel);
    const camera = scene.activeCamera;
    if (camera) {
      panel.position.z = camera?.position.z + 5;
      panel.position.x = camera?.position.x;
      if (!(camera instanceof WebXRCamera)) {
        camera.detachControl(this.canvas);
        panel.position.y = camera?.position.y;
      } else {
        panel.position.y = 1;
      }
    }

    const button = new Button3D("greeting Button");
    const greetingText = new TextBlock();
    greetingText.text = 'Welcome to the Maze of Delon!\n\n\n'
      + 'Enter the maze and search\nfor the fountain of Magic.\n'
      + "And don't touch the Fireballs...\n\n\n"
      + 'Click here to start the game.';
    greetingText.color = "white";
    greetingText.fontSize = 15;
    button.content = greetingText;
    panel.addControl(button);

    button.onPointerUpObservable.add(() => {
      manager.dispose();
      camera?.attachControl(this.canvas, false);
      this.state = State.GAME;
    });
  }

  lose(scene: Scene): void {
    if (this.state === State.GAME) {
      this.state = State.LOSE;
      this.player.resetToStartPosition();
      const manager = new GUI3DManager(scene);
      const panel = new StackPanel3D();

      manager.addControl(panel);
      const camera = scene.activeCamera;
      if (camera) {
        panel.position.z = camera?.position.z + 5;
        panel.position.x = camera?.position.x;
        panel.position.y = camera?.position.y;
      }

      const button = new Button3D("lose Button");
      const greetingText = new TextBlock();
      greetingText.text = 'You died!\n\n\n'
        + 'Next time try to avoid the fire balls.\n\n\n'
        + 'Click here to restart the game.';
      greetingText.color = "white";
      greetingText.fontSize = 15;
      button.content = greetingText;
      panel.addControl(button);

      button.onPointerUpObservable.add(() => {
        manager.dispose();
        window.location.reload();
      });
    }
  }

  win(scene: Scene): void {
    if (this.state !== State.WIN) {
      this.state = State.WIN;
      this.player.resetToStartPosition();

      const manager = new GUI3DManager(scene);
      const panel = new StackPanel3D();

      manager.addControl(panel);
      const camera = scene.activeCamera;
      if (camera) {
        panel.position.z = camera?.position.z + 5;
        panel.position.x = camera?.position.x;
        if (camera instanceof WebXRCamera) {
          panel.position.y = 1;
        } else {
          panel.position.y = camera?.position.y;
        }
      }

      const button = new Button3D("win Button");
      const winText = new TextBlock();
      winText.text = 'CONGRATULATIONS!\n\n\n'
        + 'You won the game!.\n\n\n'
        + 'Click here to restart the game.';
      winText.color = "white";
      winText.fontSize = 15;
      button.content = winText;
      panel.addControl(button);

      button.onPointerUpObservable.add(() => {
        window.location.reload();
      });
    }
  }

  getState(): State {
    return this.state
  }
}
