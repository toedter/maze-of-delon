import {Mesh, MeshBuilder, NodeMaterial, Scene, ShadowDepthWrapper, Vector3} from "@babylonjs/core";
import {Area} from "amazer";

export class FireBall {
  private readonly mesh: Mesh;
  private moveDirection: string;
  private static nodeMaterial: NodeMaterial;

  constructor(private scene: Scene, private maze: Area, position: Vector3) {
    this.mesh = MeshBuilder.CreateSphere("fireball", {
      diameter: 3,
      segments: 32
    });
    this.mesh.position = position;
    this.moveDirection = 'up';

    if (!FireBall.nodeMaterial) {
      NodeMaterial.ParseFromFileAsync('fireballMaterial', './assets/material/fireballMaterial.json', scene)
        .then((nodeMaterial) => {
          this.mesh.material = nodeMaterial;
          this.mesh.material.shadowDepthWrapper = new ShadowDepthWrapper(nodeMaterial, scene);
          FireBall.nodeMaterial = nodeMaterial;
        });
    } else {
      this.mesh.material = FireBall.nodeMaterial;
      this.mesh.material.shadowDepthWrapper = new ShadowDepthWrapper(FireBall.nodeMaterial, scene);
    }

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
  }

  getMesh(): Mesh {
    return this.mesh;
  }
}
