import {Mesh, MeshBuilder, NodeMaterial, Scene, ShadowDepthWrapper, ShadowGenerator, Vector3} from "@babylonjs/core";
import {Area} from "amazer";
import {Game} from "./game";

export class FireBall {
  private readonly mesh: Mesh;
  private moveDirection: string;
  private collider: Mesh;

  constructor(private scene: Scene, private maze: Area, position: Vector3, private game: Game) {
    this.mesh = MeshBuilder.CreateSphere("fireball", {
      diameter: 3,
      segments: 32
    });

    this.mesh.position = position;
    this.moveDirection = 'up';

    this.collider = new Mesh('fireball collider', scene);
    this.collider.visibility = 0;

    scene.registerBeforeRender(() => this.move());
  }

  private move() {
    let moveDirection = this.moveDirection;

    const checkX = (Math.round(this.mesh.position.z) % 5 === 0 && (Math.abs(Math.round(this.mesh.position.z) - this.mesh.position.z)) < 0.02)
      && (Math.round(this.mesh.position.x) % 5 === 0 && (Math.abs(Math.round(this.mesh.position.x) - this.mesh.position.x)) < 0.02)

    if (checkX) {
      this.mesh.position.x = Math.round(this.mesh.position.x);
      this.mesh.position.z = Math.round(this.mesh.position.z);
      const mazeX = (this.mesh.position.x + 100) / 5;
      const mazeY = (this.mesh.position.z + 90) / 5;

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
    this.moveDirection = moveDirection;

    this.mesh.moveWithCollisions(moveVector);

    if (this.scene.activeCamera) {
      this.collider.position.x = this.scene.activeCamera.position.x;
      this.collider.position.z = this.scene.activeCamera.position.z;
      this.collider.position.y = 2;

      if (this.mesh.intersectsMesh(this.collider)) {
        this.game.loseGame(this.scene);
      }
    }
  }

  getMesh(): Mesh {
    return this.mesh;
  }

  static createFireballs(maze: Area, mazeCellSize: number, shadowGenerator: ShadowGenerator, scene: Scene, game: Game): void {
    NodeMaterial.ParseFromFileAsync('fireballMaterial', './assets/material/fireballMaterial.json', scene)
      .then((nodeMaterial) => {
        let fireBallCount = 0;
        while (fireBallCount < 10) {
          const x = Math.floor(maze.width * Math.random());
          const y = Math.floor(maze.height * Math.random());
          if (maze.tiles[x][y].name === 'Floor') {
            const fireBall = new FireBall(scene, maze, new Vector3(x * mazeCellSize - 100, 2, y * mazeCellSize - 90), game)
            shadowGenerator.addShadowCaster(fireBall.getMesh());
            fireBall.mesh.material = nodeMaterial;
            fireBall.mesh.material.shadowDepthWrapper = new ShadowDepthWrapper(nodeMaterial, scene);
            fireBallCount += 1;
          }
        }
      });
  }
}