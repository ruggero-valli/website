/*********************************************************************
 * Camera
 *********************************************************************/
class Camera {

    constructor() {
        this.x = 0;
        this.y = 0;
        this.zoom = 40;
    }

    worldToScreen(x, y, canvas) {
        const rect = canvas.getBoundingClientRect();

        return {
            x: (rect.width / 2 + (x - this.x) * this.zoom),
            y: (rect.height / 2 - (y - this.y) * this.zoom)
        };
    }

    screenToWorld(x, y, canvas) {
        const rect = canvas.getBoundingClientRect();

        return {
            x: (x - rect.width / 2) / this.zoom + this.x,
            y: -(y - rect.height / 2) / this.zoom + this.y
        };
    }

    CSSToScreen(x, y, canvas) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (x - rect.left*0) * canvas.width / rect.width,
            y: (y - rect.top*0) * canvas.height / rect.height
        };
    }

    CSSToWorld(x, y, canvas) {
        const screen = this.CSSToScreen(x,y, canvas);
        return this.screenToWorld(screen.x, screen.y, canvas);s
    }
}

/*********************************************************************
 * Renderer
 *********************************************************************/
class Renderer {

    constructor(canvas, sim) {

        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        this.sim = sim;
        this.camera = new Camera();

        this.followCOM = false;
        this.resize();
        window.addEventListener("resize", () => this.resize());
    }

    resize() {
        this.canvas.width = innerWidth;
        this.canvas.height = innerHeight;
    }

    drawGrid() {

        const ctx = this.ctx;

        ctx.strokeStyle = "#0c1a2f";
        ctx.lineWidth = 1;

        const step = 1;

        const left = this.camera.screenToWorld(0, 0, this.canvas).x;
        const right = this.camera.screenToWorld(this.canvas.width, 0, this.canvas).x;

        const bottom = this.camera.screenToWorld(0, this.canvas.height, this.canvas).y;
        const top = this.camera.screenToWorld(0, 0, this.canvas).y;

        ctx.beginPath();

        for (let x = Math.floor(left); x <= right; x += step) {
            const p = this.camera.worldToScreen(x, 0, this.canvas);
            ctx.moveTo(p.x, 0);
            ctx.lineTo(p.x, this.canvas.height);
        }

        for (let y = Math.floor(bottom); y <= top; y += step) {
            const p = this.camera.worldToScreen(0, y, this.canvas);
            ctx.moveTo(0, p.y);
            ctx.lineTo(this.canvas.width, p.y);
        }

        ctx.stroke();
    }

    drawBody(b) {

        const p = this.camera.worldToScreen(b.position[0], b.position[1], this.canvas);

        const r = 3 + 2 * Math.sqrt(b.mass) * (this.camera.zoom / 40);

        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        this.ctx.fillStyle = b.color;
        this.ctx.fill();
    }

    drawTrail(b) {

        const ctx = this.ctx;
        if (b.trail.length < 2) return;

        ctx.strokeStyle = b.color;

        for (let i = 1; i < b.trail.length; i++) {

            const a = b.trail[i - 1];
            const c = b.trail[i];

            const p1 = this.camera.worldToScreen(a[0], a[1], this.canvas);
            const p2 = this.camera.worldToScreen(c[0], c[1], this.canvas);

            ctx.globalAlpha = i / b.trail.length * 0.6;

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
    }

    drawGhostBody(interaction) {

        if (!interaction.dragging) return;

        const p = this.camera.worldToScreen(
            interaction.dragStart.x,
            interaction.dragStart.y,
            this.canvas
        );

        const mass = interaction.nextMass;
        const r = (3 + 2 * Math.sqrt(mass)) * (this.camera.zoom / 40);
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, r, 0, Math.PI * 2);

        this.ctx.fillStyle = "rgba(255,255,255,0.2)";
        this.ctx.fill();

        this.ctx.strokeStyle = "rgba(255,255,255,0.8)";
        this.ctx.stroke();
    }

    render() {

        const ctx = this.ctx;

        ctx.fillStyle = "#060f1d";
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawGrid();
        this.drawPreview(interaction.preview);
        this.drawGhostBody(interaction);

        for (const b of this.sim.bodies) this.drawTrail(b);
        for (const b of this.sim.bodies) this.drawBody(b);
    }

    drawPreview(points) {

        if (!points || points.length < 2) return;

        const ctx = this.ctx;

        ctx.beginPath();

        const p0 = this.camera.worldToScreen(points[0][0], points[0][1], this.canvas);
        ctx.moveTo(p0.x, p0.y);

        for (let i = 1; i < points.length; i++) {

            const p = this.camera.worldToScreen(points[i][0], points[i][1], this.canvas);
            ctx.lineTo(p.x, p.y);
        }

        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.setLineDash([]);
    }
}

/*********************************************************************
 * Interaction
 *********************************************************************/
class Interaction {

    constructor(canvas, sim, renderer) {

        this.canvas = canvas;
        this.sim = sim;
        this.r = renderer;

        this.dragging = false;
        this.panning = false;

        this.lastPreviewTime = 0;
        this.previewInterval = 100; // 10 Hz

        this.nextMass = 10;

        this.dragStart = null;
        this.dragNow = null;

        this.preview = [];

        this.install();
    }

    install() {

        const c = this.canvas;

        c.oncontextmenu = e => e.preventDefault();

        c.addEventListener("wheel", e => {
            e.preventDefault()

            const before = this.r.camera.CSSToWorld(e.offsetX, e.offsetY, this.canvas);

            const factor = e.deltaY > 0 ? 0.9 : 1.1;

            this.r.camera.zoom = Math.max(5, Math.min(500, this.r.camera.zoom * factor));

            const after = this.r.camera.CSSToWorld(e.offsetX, e.offsetY, this.canvas);

            this.r.camera.x += before.x - after.x;
            this.r.camera.y += before.y - after.y;
        });

        c.addEventListener("mousedown", e => {

            const shift = e.shiftKey;

            const w = this.r.camera.CSSToWorld(e.offsetX, e.offsetY, this.canvas);
            
            if (shift) {
                this.panning = true;
                this.panStart = { x: e.offsetX, y: e.offsetY };
                this.camStart = { x: this.r.camera.x, y: this.r.camera.y };
                return;
            }

            if (e.button === 0) {
                this.dragging = true;
                this.simPaused = true;

                this.dragStart = w;
                this.dragNow = w;
            }
        });

        c.addEventListener("mousemove", e => {

            const w = this.r.camera.CSSToWorld(e.offsetX, e.offsetY, this.canvas);

            if (this.panning) {

                const dx = (e.offsetX - this.panStart.x) / this.r.camera.zoom;
                const dy = (e.offsetY - this.panStart.y) / this.r.camera.zoom;

                this.r.camera.x = this.camStart.x - dx;
                this.r.camera.y = this.camStart.y + dy;

                return;
            }

            if (!this.dragging) return;

            this.dragNow = w;

            const now = performance.now();
            if (now - this.lastPreviewTime > this.previewInterval) {
                this.computePreview();
                this.lastPreviewTime = now;
            }
        });

        c.addEventListener("mouseup", e => {

            if (this.dragging) {

                this.dragging = false;
                this.simPaused = false;

                const dx = this.dragNow.x - this.dragStart.x;
                const dy = this.dragNow.y - this.dragStart.y;

                const b = new Body(
                    this.nextMass,
                    this.dragStart.x,
                    this.dragStart.y,
                    -dx * 2,
                    -dy * 2
                );

                b.color = `hsl(${Math.random() * 360},70%,60%)`;

                this.sim.addBody(b);

                this.preview = [];
            }

            this.panning = false;
        });

        canvas.addEventListener("contextmenu", e => {

            e.preventDefault();

            const p = this.r.camera.CSSToWorld(
                e.offsetX,
                e.offsetY,
                this.canvas
            );

            let bestIndex = -1;
            let bestDist = Infinity;

            for (let i = 0; i < this.sim.bodies.length; i++) {

                const b = this.sim.bodies[i];

                const dx = b.position[0] - p.x;
                const dy = b.position[1] - p.y;

                const dist = Math.sqrt(dx * dx + dy * dy);

                const radius = (3 + 2 * Math.sqrt(b.mass)) / this.r.camera.zoom;

                if (dist < radius && dist < bestDist) {
                    bestDist = dist;
                    bestIndex = i;
                }
            }

            if (bestIndex >= 0) {
                this.sim.removeBody(bestIndex);
            }
        });
    }

    computePreview() {

        const temp = new GravitySystem();

        for (const b of this.sim.bodies) {
            temp.addBody(new Body(b.mass, b.position[0], b.position[1], b.velocity[0], b.velocity[1]));
        }

        const dx = this.dragNow.x - this.dragStart.x;
        const dy = this.dragNow.y - this.dragStart.y;

        const test = new Body(this.nextMass, this.dragStart.x, this.dragStart.y, -2 * dx, -2 * dy);

        temp.addBody(test);

        this.preview = [];

        for (let i = 0; i < 300; i++) {

            temp.step(1 / 120);

            if (i % 6 === 0) {
                this.preview.push([...test.position]);
            }
        }
    }
}


/*********************************************************************
 * Buttons and sliders
 *********************************************************************/
const pauseBtn = document.getElementById("pauseBtn");

pauseBtn.onclick = () => {

    interaction.simPaused =
        !interaction.simPaused;

    pauseBtn.innerText =
        interaction.simPaused ?
        "Resume" :
        "Pause";

};

document
.getElementById("resetBtn")
.onclick=()=>{

    sim.bodies=[];

};

document.getElementById("comBtn").onclick = () => {

    sim.setCOMFrame();

};

const slider =
document.getElementById("massSlider");

const value =
document.getElementById("massValue");

slider.oninput=()=>{

    interaction.nextMass =
        Number(slider.value);

    value.innerText =
        slider.value;

};

/*********************************************************************
 * Main loop
 *********************************************************************/
const canvas = document.getElementById("canvas");

const sim = new GravitySystem();
const renderer = new Renderer(canvas, sim);
const interaction = new Interaction(canvas, sim, renderer);

function loop(t) {

    if (!interaction.simPaused) {
        sim.step(1 / 120);
    }

    for (const b of sim.bodies) {
        b.trail.push([...b.position]);
        if (b.trail.length > 120) b.trail.shift();
    }

    renderer.render();

    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

