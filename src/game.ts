import {
  Animation,
  Camera,
  CircleEase,
  Color3,
  DirectionalLight,
  EasingFunction,
  Engine,
  FreeCamera,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  NodeMaterial,
  Scene,
  ShadowDepthWrapper,
  ShadowGenerator,
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
import {FireBall} from "./fireball";

export class Game {
  private readonly canvas: HTMLCanvasElement;
  private readonly engine: Engine;

  private isMoving = false;
  private xrCamera!: WebXRCamera;
  private camera!: FreeCamera;
  private maze!: Area;

  constructor() {
    this.canvas = <HTMLCanvasElement>document.getElementById("renderCanvas");
    this.engine = new Engine(this.canvas, true);
    const scene = this.createScene();

    const collider = new Mesh('collider', scene);
    collider.visibility = 0;

    const divFps = document.getElementById("fps");

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
      if (divFps) {
        divFps.innerHTML = this.engine.getFps().toFixed() + " fps";
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

    const mazeSize = 35;
    const mazeCellSize = 5;

    const camera = new FreeCamera("playerCamera", new Vector3(-10, 1, -(mazeSize + 65)), scene);
    camera.checkCollisions = true;
    camera.minZ = 0.01;
    camera.ellipsoid = new Vector3(1, 1, 1);
    camera.applyGravity = true;
    camera.speed = 0.2;
    camera.angularSensibility = 10000;
    camera.attachControl(this.canvas, true);
    this.camera = camera;

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
        if (!(x <= (mazeSize/2 + 2) && x > mazeSize/2                        && y === 0)) {
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

    let fireBallCount = 0;
    while (fireBallCount < 10) {
      const x = Math.floor(mazeSize * Math.random());
      const y = Math.floor(mazeSize * Math.random());
      if (this.maze.tiles[x][y].name === 'Floor') {
        const fireBall = this.createFireball(scene);
        fireBall.position.y = 2;
        fireBall.position.x = x * mazeCellSize - 100;
        fireBall.position.z = y * mazeCellSize - 90;
        shadowGenerator.addShadowCaster(fireBall);
        fireBallCount += 1;
      }
    }

    scene.createDefaultXRExperienceAsync({
      floorMeshes: [largeGround]
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

    return scene;
  }

  private createFireball(scene: Scene): Mesh {
    const fireball = MeshBuilder.CreateSphere("fireball", {
      diameter: 3,
      segments: 32
    }, scene);
    (fireball as any).moveDirection = 'up';
    // fireball.showBoundingBox = true;

    NodeMaterial.ParseFromSnippetAsync("JN2BSF#29", scene).then((nodeMaterial) => {
      fireball.material = nodeMaterial;
      fireball.material.shadowDepthWrapper = new ShadowDepthWrapper(nodeMaterial, scene);
    });

    scene.registerBeforeRender(() => {
        let moveDirection = (fireball as any).moveDirection;

        const checkX = (Math.round(fireball.position.z) % 5 === 0 && (Math.abs(Math.round(fireball.position.z) - fireball.position.z)) < 0.02)
          && (Math.round(fireball.position.x) % 5 === 0 && (Math.abs(Math.round(fireball.position.x) - fireball.position.x)) < 0.02)

        if (checkX) {
          fireball.position.x = Math.round(fireball.position.x);
          fireball.position.z = Math.round(fireball.position.z);
          const mazeX = (fireball.position.x + 100) / 5;
          const mazeY = (fireball.position.z + 90) / 5;

          const maze = this.maze;
          const moveDirections: string[] = [];
          if (moveDirection === 'up') {
            if (maze.tiles[mazeX][mazeY + 1].name === 'Floor') {
              moveDirections.push('up');
            }
            if (maze.tiles[mazeX + 1][mazeY].name === 'Floor') {
              moveDirections.push('right');
            }
            if (maze.tiles[mazeX - 1][mazeY].name === 'Floor') {
              moveDirections.push('left');
            }
            if (moveDirections.length === 0 && maze.tiles[mazeX][mazeY + 1].name === 'Wall') {
              moveDirections.push('down');
            }
          } else if (moveDirection === 'down') {
            if (maze.tiles[mazeX][mazeY - 1].name === 'Floor') {
              moveDirections.push('down');
            }
            if (maze.tiles[mazeX + 1][mazeY].name === 'Floor') {
              moveDirections.push('right');
            }
            if (maze.tiles[mazeX - 1][mazeY].name === 'Floor') {
              moveDirections.push('left');
            }
            if (moveDirections.length === 0 && maze.tiles[mazeX][mazeY - 1].name === 'Wall') {
              moveDirections.push('up');
            }
          } else if (moveDirection === 'right') {
            if (maze.tiles[mazeX + 1][mazeY].name === 'Floor') {
              moveDirections.push('right');
            }
            if (maze.tiles[mazeX][mazeY + 1].name === 'Floor') {
              moveDirections.push('up');
            }
            if (maze.tiles[mazeX][mazeY - 1].name === 'Floor') {
              moveDirections.push('down');
            }
            if (moveDirections.length === 0 && maze.tiles[mazeX + 1][mazeY].name === 'Wall') {
              moveDirections.push('left');
            }
          } else if (moveDirection === 'left') {
            if (maze.tiles[mazeX - 1][mazeY].name === 'Floor') {
              moveDirections.push('left');
            }
            if (maze.tiles[mazeX][mazeY + 1].name === 'Floor') {
              moveDirections.push('up');
            }
            if (maze.tiles[mazeX][mazeY - 1].name === 'Floor') {
              moveDirections.push('down');
            }
            if (moveDirections.length === 0 && maze.tiles[mazeX - 1][mazeY].name === 'Wall') {
              moveDirections.push('right');
            }
          }
          if (moveDirections.length > 0) {
            const rand = Math.floor(Math.random() * moveDirections.length)
            moveDirection = moveDirections[rand];
          }
        }


        // else if (moveDirection === 'right' && maze.tiles[mazeX + 2][mazeY].name === 'Wall') {
        //   moveDirections.push('down';
        // } else if (moveDirection === 'down' && maze.tiles[mazeX][mazeY + 1].name === 'Wall') {
        //   if (maze.tiles[mazeX + 1][mazeY + 2].name === 'Floor') {
        //     moveDirections.push('right';
        //   } else {
        //     moveDirections.push('up';
        //   }
        //   console.log(maze.tiles[mazeX - 1][mazeY + 1].name + '|' + maze.tiles[mazeX][mazeY + 1].name + '|' + maze.tiles[mazeX + 1][mazeY + 1].name);
        //   console.log(maze.tiles[mazeX - 1][mazeY].name + '|' + maze.tiles[mazeX][mazeY].name + '|' + maze.tiles[mazeX + 1][mazeY].name);
        //   console.log(maze.tiles[mazeX - 1][mazeY - 1].name + '|' + maze.tiles[mazeX][mazeY - 1].name + '|' + maze.tiles[mazeX + 1][mazeY - 1].name);
        //
        // }

        let moveVector = new Vector3(0, 0, 0);
        const speed = 0.1;
        if (moveDirection === 'up') {
          moveVector = new Vector3(0, 0, speed);
        } else if (moveDirection === 'right') {
          moveVector = new Vector3(speed, 0, 0);
        } else if (moveDirection === 'down') {
          moveVector = new Vector3(0, 0, -speed);
        } else if (moveDirection === 'left') {
          moveVector = new Vector3(-speed, 0, 0);
        }
        (fireball as any).moveDirection = moveDirection;

        // fireball.onCollide = () => {
        //   const rand = Math.random();
        //   let moveDirection: string;
        //   if (rand > 0 && rand < 0.25) {
        //     moveDirections.push('right';
        //   } else if (rand > 0.25 && rand < 0.5) {
        //     moveDirections.push('down';
        //   } else if (rand > 0.5 && rand < 0.75) {
        //     moveDirections.push('left';
        //   } else {
        //     moveDirections.push('up';
        //   }
        //   (fireball as any).moveDirections.push(moveDirection;
        // };


        fireball.moveWithCollisions(moveVector);
      }
    );

    return fireball;
  }

  private cameraJump(scene: Scene, camera: Camera, direction: number) {
    camera.animations = [];

    const a: Animation = new Animation(
      "a",
      "position.y", 20,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CYCLE);

    // Animation keys
    const keys = [];
    keys.push({frame: 0, value: camera.position.y});
    keys.push({frame: 10, value: camera.position.y + direction});

    a.setKeys(keys);

    const easingFunction = new CircleEase();
    easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
    a.setEasingFunction(easingFunction);

    camera.animations.push(a);

    scene.beginAnimation(camera, 0, 20, false);
  }

  private getShadowGenerator(scene: Scene): ShadowGenerator {
    // light1
    const light1 = new DirectionalLight("dir01", new Vector3(-0.2, -1, -0.2), scene);
    light1.position = new Vector3(-8, 50, 0);
    light1.intensity = 1.5;

    // const lightSphere = Mesh.CreateSphere("sphere", 10, 2, scene);
    // lightSphere.position = light1.position;
    // lightSphere.material = new StandardMaterial("light", scene);
    const shadowGenerator = new ShadowGenerator(1000, light1);
    shadowGenerator.useExponentialShadowMap = true;
    shadowGenerator.useContactHardeningShadow = true;
    shadowGenerator.contactHardeningLightSizeUVRatio = 0.0075;

    return shadowGenerator;
  }
}
