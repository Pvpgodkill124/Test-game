const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let player = { x: 200, y: 200, size: 20, color: "gold", name: "", hp: 100 };
let bullets = [];
let bots = [];

function startGame() {
    document.getElementById("login-screen").style.display = "none";
    canvas.style.display = "block";
    spawnBots(14);
    gameLoop();
}

function spawnBots(count) {
    for (let i = 0; i < count; i++) {
        bots.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: 20,
            color: "red",
            hp: 50
        });
    }
}

function drawPlayer(p) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
}

function drawBots() {
    bots.forEach(bot => {
        ctx.fillStyle = bot.color;
        ctx.beginPath();
        ctx.arc(bot.x, bot.y, bot.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawBullets() {
    bullets.forEach(b => {
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
        ctx.fill();
    });
}

function updateBullets() {
    bullets.forEach((b, index) => {
        b.x += b.vx;
        b.y += b.vy;
        bots.forEach(bot => {
            let dx = b.x - bot.x;
            let dy = b.y - bot.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < bot.size) {
                bot.hp -= 20;
                bullets.splice(index, 1);
            }
        });
    });
    bots = bots.filter(bot => bot.hp > 0);
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPlayer(player);
    drawBots();
    drawBullets();
    updateBullets();
    requestAnimationFrame(gameLoop);
}

document.getElementById("start-btn").addEventListener("click", () => {
    player.name = document.getElementById("player-name").value || "Player";
    startGame();
});

document.getElementById("shoot-btn").addEventListener("click", () => {
    if (bots.length > 0) {
        let target = bots[0];
        let angle = Math.atan2(target.y - player.y, target.x - player.x);
        bullets.push({
            x: player.x,
            y: player.y,
            vx: Math.cos(angle) * 5,
            vy: Math.sin(angle) * 5
        });
    }
});
