"use strict";

/*********************************************************************
 * Body
 *********************************************************************/
class Body {

    constructor(mass, x, y, vx = 0, vy = 0) {

        this.mass = mass;

        this.position = new Float64Array([x, y]);
        this.velocity = new Float64Array([vx, vy]);
        this.acceleration = new Float64Array([0, 0]);

        this.color = null;
        this.trail = [];
    }
}


/*********************************************************************
 * Gravity System
 *********************************************************************/
class GravitySystem {

    constructor() {

        this.G = 1.0;
        this.softening = 0.5;

        this.bodies = [];
    }

    addBody(b) {
        this.bodies.push(b);
        this.computeAccelerations();
    }

    removeBody(i) {
        this.bodies.splice(i, 1);
        this.computeAccelerations();
    }

    computeAccelerations() {

        const eps2 = this.softening * this.softening;

        for (const b of this.bodies) {
            b.acceleration[0] = 0;
            b.acceleration[1] = 0;
        }

        const n = this.bodies.length;

        for (let i = 0; i < n; i++) {

            const A = this.bodies[i];

            for (let j = i + 1; j < n; j++) {

                const B = this.bodies[j];

                const dx = B.position[0] - A.position[0];
                const dy = B.position[1] - A.position[1];

                const r2 = dx * dx + dy * dy + eps2;

                const invR = 1 / Math.sqrt(r2);
                const invR3 = invR * invR * invR;

                const fA = this.G * B.mass * invR3;
                const fB = this.G * A.mass * invR3;

                const ax = fA * dx;
                const ay = fA * dy;

                const bx = fB * dx;
                const by = fB * dy;

                A.acceleration[0] += ax;
                A.acceleration[1] += ay;

                B.acceleration[0] -= bx;
                B.acceleration[1] -= by;
            }
        }
    }

    step(dt) {

        const oldAx = new Float64Array(this.bodies.length);
        const oldAy = new Float64Array(this.bodies.length);

        for (let i = 0; i < this.bodies.length; i++) {

            const b = this.bodies[i];

            oldAx[i] = b.acceleration[0];
            oldAy[i] = b.acceleration[1];

            b.position[0] += b.velocity[0] * dt + 0.5 * b.acceleration[0] * dt * dt;
            b.position[1] += b.velocity[1] * dt + 0.5 * b.acceleration[1] * dt * dt;
        }

        this.computeAccelerations();

        for (let i = 0; i < this.bodies.length; i++) {

            const b = this.bodies[i];

            b.velocity[0] += 0.5 * (oldAx[i] + b.acceleration[0]) * dt;
            b.velocity[1] += 0.5 * (oldAy[i] + b.acceleration[1]) * dt;
        }
    }

    centerOfMass() {

        let M = 0;
        let x = 0, y = 0;

        for (const b of this.bodies) {
            M += b.mass;
            x += b.mass * b.position[0];
            y += b.mass * b.position[1];
        }

        if (M === 0) return [0, 0];

        return [x / M, y / M];
    }

    centerOfMassVelocity() {

        let M = 0;
        let vx = 0, vy = 0;

        for (const b of this.bodies) {
            M += b.mass;
            vx += b.mass * b.velocity[0];
            vy += b.mass * b.velocity[1];
        }

        if (M === 0) return [0, 0];

        return [vx / M, vy / M];
    }

    setCOMFrame() {

        const com = this.centerOfMass();
        const comV = this.centerOfMassVelocity();

        for (const b of this.bodies) {

            // shift positions so COM is at origin
            b.position[0] -= com[0];
            b.position[1] -= com[1];

            // subtract bulk velocity so COM is stationary
            b.velocity[0] -= comV[0];
            b.velocity[1] -= comV[1];

            // shift trails
            for (let i = 0; i < b.trail.length; i++) {
                b.trail[i][0] -= com[0];
                b.trail[i][1] -= com[1];
            }
        }
    }
}