import {Color4, Mesh, MeshBuilder, ParticleSystem, Scene, StandardMaterial, Texture, Vector3} from "@babylonjs/core";
import flareTexture from "./assets/textures/flare.png"
import {MarbleProceduralTexture} from "@babylonjs/procedural-textures";

export class Fountain {
  constructor(private scene: Scene, position: Vector3) {
    // This fountain is copied from https://playground.babylonjs.com/#KBS9I5#93

    // Create a particle system
    const particleSystem = new ParticleSystem("particles", 5000, scene);

    //Texture of each particle
    particleSystem.particleTexture = new Texture(flareTexture, scene);

    // Where the particles come from
    particleSystem.emitter = new Vector3(position.x, position.y + 2.6, position.z); // emitted from the top of the fountain
    particleSystem.minEmitBox = new Vector3(-0.01, 0, -0.01); // Starting all from
    particleSystem.maxEmitBox = new Vector3(0.01, 0, 0.01); // To...

    // Colors of all particles
    particleSystem.color1 = new Color4(1, 0.4, 0, 1.0);
    particleSystem.color2 = new Color4(0.8, 0.2, 0, 1.0);

    // Size of each particle (random between...
    particleSystem.minSize = 0.01;
    particleSystem.maxSize = 0.05;

    // Life time of each particle (random between...
    particleSystem.minLifeTime = 0.3;
    particleSystem.maxLifeTime = 1.5;

    // Emission rate
    particleSystem.emitRate = 1500;

    // Blend mode : BLENDMODE_ONEONE, or BLENDMODE_STANDARD
    particleSystem.blendMode = ParticleSystem.BLENDMODE_ONEONE;

    // Set the gravity of all particles
    particleSystem.gravity = new Vector3(0, -9.81, 0);

    // Direction of each particle after it has been emitted
    particleSystem.direction1 = new Vector3(-1, 8, 1);
    particleSystem.direction2 = new Vector3(1, 8, -1);

    // Power and speed
    particleSystem.minEmitPower = 0.2;
    particleSystem.maxEmitPower = 0.6;
    particleSystem.updateSpeed = 0.01;

    const fountainProfile = [
      new Vector3(0, 0, 0),
      new Vector3(0.5, 0, 0),
      new Vector3(0.5, 0.2, 0),
      new Vector3(0.4, 0.2, 0),
      new Vector3(0.4, 0.05, 0),
      new Vector3(0.05, 0.1, 0),
      new Vector3(0.05, 0.8, 0),
      new Vector3(0.15, 0.9, 0)
    ];

    //Create lathed fountain
    const fountain = MeshBuilder.CreateLathe("fountain", {
      shape: fountainProfile,
      sideOrientation: Mesh.DOUBLESIDE
    });
    fountain.position = position;
    fountain.scaling = new Vector3(3,3,3);

    const marbleMaterial = new StandardMaterial("torus", scene);
    const marbleTexture = new MarbleProceduralTexture("marble", 512, scene);
    marbleTexture.numberOfTilesHeight = 3;
    marbleTexture.numberOfTilesWidth = 3;
    marbleMaterial.ambientTexture = marbleTexture;
    fountain.material = marbleMaterial;


    particleSystem.start();
  }
}
