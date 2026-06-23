const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("score");



/* ---------------- CONFIG ---------------- */
const box = 20;

/* ---------------- STATE ---------------- */
let score = 0;
let paused = false;
let dead = false;
let snake = [];
let food = [];
let dir = { x: box, y: 0 };
let keys = {};
let hue = 0;
let flash = 0;
let sssChaos = false;
let scoreHistory = [];
let e9headArmorCharges = 0;

/* ---------------- OBSTACLES ---------------- */
const obstacles = [];
function spawnObstacle() {
    return {
        x: Math.floor(Math.random() * (canvas.width  / box)) * box,
        y: Math.floor(Math.random() * (canvas.height / box)) * box
    };
}
function updateObstacles() {
    if (noObstaclesActive) { obstacles.length = 0; return; }
    const target = Math.floor(score / 3);
    while (obstacles.length < target) obstacles.push(spawnObstacle());
}

/* ========================
   EXTENSION 6 : FLAGS
   ======================== */
let currentSpeed      = 85;
let ghostActive       = false;
let invincibleActive  = false;
let scoreMultiplier   = 1;
let magnetActive      = false;
let shieldActive      = false;
let freezeFoodActive  = false;
let reverseControls   = false;
let bigHeadActive     = false;
let rainbowTickActive = false;
let noObstaclesActive = false;
const powerUps        = [];
const activePowerUps  = {};

/* ---------------- OVERLAY ---------------- */
const overlay = document.createElement("div");
overlay.style = `position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0);backdrop-filter:blur(0px);transition:0.3s;pointer-events:none;`;
document.body.appendChild(overlay);
function setDark(active) {
    overlay.style.background = active ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0)";
    overlay.style.backdropFilter = active ? "blur(4px)" : "blur(0px)";
}

/* ---------------- RANK ---------------- */
function getRank(s) {
    if (s >= 1000) return "SSS";
    if (s >= 950) return "SS";
    if (s >= 750) return "S";
    if (s >= 500) return "A";
    if (s >= 250) return "B";
    if (s >= 100) return "C";
    return "D";
}

/* ---------------- UI ---------------- */
const pauseMenu = document.createElement("div");
pauseMenu.style = `position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);padding:25px 40px;background:rgba(0,0,0,0.85);border:2px solid #00ffff;box-shadow:0 0 25px #00ffff;color:#00ffff;font-family:Arial;font-size:28px;text-align:center;border-radius:12px;display:none;z-index:10;`;
document.body.appendChild(pauseMenu);
const deathMenu = document.createElement("div");
deathMenu.style = `position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);display:none;z-index:10;`;
document.body.appendChild(deathMenu);

/* ---------------- FOOD ---------------- */
function spawnFood() {
    return {
        x: Math.floor(Math.random() * (canvas.width  / box)) * box,
        y: Math.floor(Math.random() * (canvas.height / box)) * box
    };
}
function initFood() { food = [spawnFood(), spawnFood(), spawnFood()]; }

/* ---------------- RESET ---------------- */
function reset() {
    score = 0; paused = false; dead = false; sssChaos = false;
    scoreHistory = [];
    obstacles.length = 0;
    setDark(false);
    snake = [{ x:200,y:200 },{ x:180,y:200 },{ x:160,y:200 }];
    dir = { x: box, y: 0 };
    initFood();
    scoreDisplay.textContent = "Score : 0";
    pauseMenu.style.display = "none";
    deathMenu.style.display = "none";

    // reset power-ups
    powerUps.length = 0;
    for (const k in activePowerUps) delete activePowerUps[k];
    currentSpeed      = 60;
    ghostActive       = false;
    invincibleActive  = false;
    scoreMultiplier   = 1;
    magnetActive      = false;
    shieldActive      = false;
    freezeFoodActive  = false;
    reverseControls   = false;
    bigHeadActive     = false;
    rainbowTickActive = false;
    noObstaclesActive = false;
}

/* ---------------- INPUT ---------------- */
document.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    const k = e.key.toLowerCase();
    if (k === "w") keys["ArrowUp"]    = true;
    if (k === "s") keys["ArrowDown"]  = true;
    if (k === "a") keys["ArrowLeft"]  = true;
    if (k === "d") keys["ArrowRight"] = true;

    if (e.code === "Space" && !dead) {
        paused = !paused;
        pauseMenu.innerHTML = `⏸ PAUSE<br><br>Score : ${score}<br>Rank : ${getRank(score)}<br><br>SPACE to resume`;
        pauseMenu.style.display = paused ? "block" : "none";
        setDark(paused);
    }
    if (e.key === "Escape" && !dead) {
        paused = !paused;
        pauseMenu.innerHTML = `⏸ PAUSE<br><br>Score : ${score}<br>Rank : ${getRank(score)}<br><br>ESC ou SPACE pour reprendre`;
        pauseMenu.style.display = paused ? "block" : "none";
        setDark(paused);
    }
    if (k === "r") reset();
    if (e.key === "Enter" && dead) reset();
});
document.addEventListener("keyup", (e) => {
    keys[e.key] = false;
    const k = e.key.toLowerCase();
    if (k === "w") keys["ArrowUp"]    = false;
    if (k === "s") keys["ArrowDown"]  = false;
    if (k === "a") keys["ArrowLeft"]  = false;
    if (k === "d") keys["ArrowRight"] = false;
});

/* ---------------- UPDATE ---------------- */
function update() {
    let dx = 0, dy = 0;

    // Contrôles inversés
    if (reverseControls) {
        if (keys["ArrowUp"])    dy = box;
        else if (keys["ArrowDown"])  dy = -box;
        else if (keys["ArrowLeft"])  dx = box;
        else if (keys["ArrowRight"]) dx = -box;
    } else {
        if (keys["ArrowUp"])    dy = -box;
        else if (keys["ArrowDown"])  dy = box;
        else if (keys["ArrowLeft"])  dx = -box;
        else if (keys["ArrowRight"]) dx = box;
    }

    if (!(dx === -dir.x && dy === -dir.y)) {
        if (dx || dy) dir = { x: dx, y: dy };
    }

    let head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // Ghost : wraparound au lieu de mourir
    if (ghostActive) {
        if (head.x < 0)              head.x = canvas.width  - box;
        if (head.x >= canvas.width)  head.x = 0;
        if (head.y < 0)              head.y = canvas.height - box;
        if (head.y >= canvas.height) head.y = 0;
    }

    const wall = head.x < 0 || head.y < 0 || head.x >= canvas.width || head.y >= canvas.height;
    const self = snake.some((s, i) => i !== 0 && s.x === head.x && s.y === head.y);

    if (self && e11cannibalActive) {
    e11cannibalActive = false;
    score += 2; scoreDisplay.textContent="Score : "+score;
    showPowerUpMessage("🦷 CANNIBALE +2 score !");
} else if (self && e9headArmorCharges > 0) {
    e9headArmorCharges--;
    showPowerUpMessage("🪖 ARMURE TÊTE !");
} else if ((wall || self) && !invincibleActive) { showDeath(); return; }
    if (wall && invincibleActive) return; // bloque sans mourir

    snake.unshift(head);

    let ate = false;
    food.forEach((f, i) => {
        if (head.x === f.x && head.y === f.y) {
            if (!freezeFoodActive) food[i] = spawnFood();
            const gained = (1 + (window.e9perks?.food_value || 0)) * scoreMultiplier;
            score += gained;
            flash = 0;
            ate = true;

            // hp_on_eat
const maxHp3 = 3 + (e9perks.extra_heart||0) + (e9perks.max_heart||0);
if (e9perks.hp_on_eat > 0 && Math.random() < e9perks.hp_on_eat * 0.10 && e8playerHp < maxHp3) {
    e8playerHp++;
    e9updateHpDisplay();
    showPowerUpMessage("🍏 SOIN !");
}
// xp_on_eat
if (e9perks.xp_on_eat > 0) e8gainXp(e9perks.xp_on_eat);
// coin_on_score
if (e9perks.coin_on_score > 0 && score % 5 === 0) e8coins += e9perks.coin_on_score;
            scoreDisplay.textContent = "Score : " + score;
            scoreHistory.push(score);
            if (score >= 5000 && !sssChaos) triggerSSS();
        }
    });

    if (!ate) snake.pop();
    if (!ate) scoreHistory.push(score);

    // Obstacles
    updateObstacles();
    if (!ghostActive && !invincibleActive && !(window.e9perks?.obstacle_immunity > 0)) {
    for (const o of obstacles) {
        if (snake[0].x === o.x && snake[0].y === o.y) { showDeath(); return; }
    }
}

    // Collecte power-ups
    const range = bigHeadActive ? box * 2 : box;
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const p = powerUps[i];
        if (Math.abs(head.x - p.x) < range && Math.abs(head.y - p.y) < range) {
            powerUps.splice(i, 1);
            applyPowerUp(p.type);
        }
    }

    
}

/* ---------------- DRAW ---------------- */
function draw() {
    hue += 2;
    ctx.fillStyle = "#050010";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Serpent
    snake.forEach((p, i) => {
        ctx.shadowColor = `hsl(${hue + i * 10},100%,60%)`;
        ctx.shadowBlur  = 20;
        ctx.fillStyle   = ghostActive
            ? `hsla(${hue + i * 10},100%,80%,0.4)`
            : `hsl(${hue + i * 10},100%,60%)`;
        ctx.fillRect(p.x, p.y, box, box);
    });

    // Nourriture
    food.forEach(f => {
        ctx.shadowColor = `hsl(${hue + 180},100%,60%)`;
        ctx.shadowBlur  = 25;
        ctx.fillStyle   = `hsl(${hue + 180},100%,60%)`;
        ctx.fillRect(f.x, f.y, box, box);
    });

    // Obstacles
    obstacles.forEach(o => {
        ctx.shadowBlur = 0;
        ctx.fillStyle  = "white";
        ctx.beginPath();
        ctx.moveTo(o.x + box/2, o.y);
        ctx.lineTo(o.x, o.y + box);
        ctx.lineTo(o.x + box, o.y + box);
        ctx.closePath();
        ctx.fill();
    });

    ctx.shadowBlur = 0;

    // Power-ups au sol
    powerUps.forEach(p => {
        p.tick = (p.tick || 0) + 1;
        const alpha = 0.6 + 0.4 * Math.sin(p.tick * 0.2);
        const cx = p.x + box / 2, cy = p.y + box / 2;
        const r1 = box * 0.9, r2 = box * 0.4;
        ctx.globalAlpha = alpha;
        ctx.fillStyle   = p.type.color;
        ctx.shadowColor = p.type.color;
        ctx.shadowBlur  = 18;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const angle = (Math.PI / 5) * i - Math.PI / 2;
            const r = i % 2 === 0 ? r1 : r2;
            i === 0
                ? ctx.moveTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r)
                : ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        ctx.fillStyle   = "#000";
        ctx.font        = `bold ${Math.round(box * 0.36)}px Arial`;
        ctx.textAlign   = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.type.label, cx, cy);
        ctx.textBaseline = "alphabetic";
    });

    // Bouclier
    if (shieldActive && snake[0]) {
        ctx.strokeStyle = "#0088ff"; ctx.lineWidth = 3;
        ctx.shadowColor = "#0088ff"; ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(snake[0].x + box/2, snake[0].y + box/2, box * 1.3, 0, Math.PI*2);
        ctx.stroke(); ctx.shadowBlur = 0;
    }
    // Invincible
    if (invincibleActive && snake[0]) {
        ctx.strokeStyle = "#ffff00"; ctx.lineWidth = 2;
        ctx.shadowColor = "#ffff00"; ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(snake[0].x + box/2, snake[0].y + box/2, box * 1.1, 0, Math.PI*2);
        ctx.stroke(); ctx.shadowBlur = 0;
    }

    if (flash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${flash})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        flash -= 0.05;
    }
}

/* ---------------- LOOP — une seule, vitesse dynamique ---------------- */
function loop() {
    if (!paused && !dead && !sssChaos) { update(); draw(); }
    setTimeout(loop, currentSpeed);
}

/* ---------------- OSU RESULT ---------------- */
function drawOsuResult() {
    const c = document.getElementById("resultGraph");
    if (!c) return;
    const g = c.getContext("2d");
    const w = c.width, h = c.height;
    const rank = getRank(score);
    let t = 0;
    function anim() {
        g.clearRect(0,0,w,h); g.fillStyle="#1a1a1a"; g.fillRect(0,0,w,h);
        const cx=w/2, cy=h/2-20, r=70, progress=Math.min(score/30,1);
        g.beginPath(); g.arc(cx,cy,r,0,Math.PI*2); g.strokeStyle="#333"; g.lineWidth=18; g.stroke();
        g.beginPath(); g.arc(cx,cy,r,-Math.PI/2,(-Math.PI/2)+(Math.PI*2*progress*(t/60)));
        g.strokeStyle = rank==="SSS"?"#ff00ff":rank==="SS"?"#00a2ff":rank==="S"?"#00ffff":rank==="A"?"#00ff88":rank==="B"?"#ffff00":"#ff4444";
        g.shadowColor=g.strokeStyle; g.shadowBlur=20; g.lineWidth=18; g.stroke(); g.shadowBlur=0;
        g.fillStyle=g.strokeStyle; g.font="bold 60px Arial"; g.textAlign="center"; g.fillText(rank,cx,cy+20);
        g.textAlign="left"; g.font="16px Arial"; g.fillStyle="white";
        g.fillText("Score: "+score,30,h-60);
        g.fillText("Progress: "+Math.floor(progress*100)+"%",200,h-60);
        t++; if(t<60) requestAnimationFrame(anim);
    }
    anim();
}

/* ---------------- DEATH ---------------- */
function showDeath() {
    if (invincibleActive) return;
    if (shieldActive) {
        shieldActive = false;
        delete activePowerUps["shield"];
        showPowerUpMessage("🛡 BOUCLIER BRISÉ !");
        return;
    }
    dead = true; paused = true; setDark(true);
    const rank = getRank(score);
    deathMenu.innerHTML = `
        <div style="background:rgba(0,0,0,0.95);padding:30px;border:2px solid #ff00ff;box-shadow:0 0 30px #ff00ff;color:white;font-family:Arial;text-align:center;border-radius:12px;">
        <div style="font-size:60px;">💀 GAME OVER</div>
        <div style="font-size:22px;">Score : ${score}</div>
        <div style="font-size:40px;color:#00ffff;">Rank : ${rank}</div>
        <canvas id="resultGraph" width="350" height="350" style="margin-top:60px;border:1px solid #00ffff;border-radius:10px;"></canvas>
        <div style="font-size:14px;">Press R to restart</div>
        </div>`;
    deathMenu.style.display = "flex";
    setTimeout(() => drawOsuResult(), 100);
}

/* ---------------- SSS CHAOS ---------------- */
function triggerSSS() {
    sssChaos = true; paused = true; let t = 0;
    function chaos() {
        t++;
        ctx.fillStyle=`rgba(255,255,255,${Math.random()})`;
        ctx.fillRect(0,0,canvas.width,canvas.height);
        canvas.style.transform=`translate(${(Math.random()-0.5)*1200}px,${(Math.random()-0.5)*1200}px) scale(${1+Math.random()*2})`;
        ctx.globalCompositeOperation="difference";
        ctx.fillStyle=`hsl(${Math.random()*360},100%,50%)`;
        ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.globalCompositeOperation="source-over";
        ctx.textAlign="center"; ctx.font="bold 50px Arial"; ctx.fillStyle="white";
        ctx.fillText("☢ SSS ☢",canvas.width/2,canvas.height/2);
        if(t<20) requestAnimationFrame(chaos);
        else { canvas.style.transform="none"; showSSSDeath(); }
    }
    chaos();
}
function showSSSDeath() {
    setDark(true);
    deathMenu.innerHTML=`
        <div style="background:black;padding:35px;border:3px solid #ff00ff;box-shadow:0 0 40px #ff00ff;color:white;font-family:Arial;text-align:center;border-radius:12px;">
        <div style="font-size:65px;">💀 REALITY BREAK</div>
        <div style="font-size:22px;">Score : ${score}</div>
        <div style="font-size:45px;color:#ff00ff;">Rank : SSS</div>
        <canvas id="resultGraph" width="350" height="350" style="margin-top:15px;border:1px solid #ff00ff;border-radius:10px;"></canvas>
        <div style="font-size:14px;">Simulation collapsed</div>
        </div>`;
    deathMenu.style.display="flex";
    setTimeout(()=>drawOsuResult(),100);
}

/* ---------------- START ---------------- */
reset();
loop();

/* -------- BEST SCORE -------- */
let bestScore = Number(localStorage.getItem("snakeBest")) || 0;
const bestDisplay = document.createElement("div");
bestDisplay.style=`position:absolute;top:10px;right:20px;color:#00ffff;font-family:Arial;font-size:22px;font-weight:bold;text-shadow:0 0 10px #00ffff;z-index:20;`;
bestDisplay.textContent="Best : "+bestScore;
document.body.appendChild(bestDisplay);
setInterval(()=>{ if(score>bestScore){ bestScore=score; bestDisplay.textContent="Best : "+bestScore; } },100);

/* -------- BOUTON PAUSE -------- */
const pauseButton = document.createElement("button");
pauseButton.textContent="⏸ Pause";
pauseButton.style=`position:absolute;top:10px;left:10px;padding:10px 20px;background:#000;color:#00ffff;border:2px solid #00ffff;border-radius:8px;cursor:pointer;font-size:16px;font-weight:bold;z-index:20;box-shadow:0 0 15px #00ffff;`;
document.body.appendChild(pauseButton);
pauseButton.onclick=()=>{
    if(dead) return; paused=!paused;
    pauseMenu.innerHTML=`⏸ PAUSE<br><br>Score : ${score}<br>Rank : ${getRank(score)}<br><br>SPACE ou bouton pour reprendre`;
    pauseMenu.style.display=paused?"block":"none"; setDark(paused);
};

/* -------- AIDE COMMANDES -------- */
const controls=document.createElement("div");
controls.innerHTML=`<b>Contrôles</b><br>⬆ ⬇ ⬅ ➡ / WASD<br>SPACE / ESC : Pause<br>R : Restart<br>ENTER : Restart après mort`;
controls.style=`position:absolute;bottom:15px;left:15px;background:rgba(0,0,0,0.7);padding:10px;border:1px solid #00ffff;border-radius:10px;color:white;font-family:Arial;font-size:14px;z-index:20;`;
document.body.appendChild(controls);

/* -------- FPS -------- */
const fpsDisplay=document.createElement("div");
fpsDisplay.style=`position:absolute;top:45px;right:20px;color:#00ff88;font-family:Arial;font-size:18px;z-index:20;`;
document.body.appendChild(fpsDisplay);
let fpsFrames=0,fpsLast=performance.now();
function fpsLoop(){ fpsFrames++; const now=performance.now(); if(now-fpsLast>=1000){ fpsDisplay.textContent="FPS : "+Math.round(fpsFrames*1000/(now-fpsLast)); fpsFrames=0; fpsLast=now; } requestAnimationFrame(fpsLoop); }
fpsLoop();

setInterval(()=>{ if(!paused&&!dead) hue=Math.random()*360; },5000);
setInterval(()=>{ if(score>=20&&!paused&&!dead) overlay.style.background="rgba(0,0,60,0.35)"; },100);


/* -------- FEUX D'ARTIFICE -------- */
function fireworks(){ for(let i=0;i<50;i++) setTimeout(()=>{ ctx.fillStyle=`hsl(${Math.random()*360},100%,50%)`; ctx.beginPath(); ctx.arc(Math.random()*canvas.width,Math.random()*canvas.height,5+Math.random()*15,0,Math.PI*2); ctx.fill(); },i*15); }
let fireLevel=0;
setInterval(()=>{ if(score>=10&&fireLevel<1){fireLevel=1;fireworks();} if(score>=20&&fireLevel<2){fireLevel=2;fireworks();} if(score>=30&&fireLevel<3){fireLevel=3;fireworks();} },100);

setInterval(()=>{ document.title=`Snake | Score ${score} | Rank ${getRank(score)}`; },500);
setInterval(()=>{ const saved=Number(localStorage.getItem("snakeBest"))||0; if(bestScore>saved) localStorage.setItem("snakeBest",bestScore); },1000);

/* -------- TIMER -------- */
let startTime=Date.now();
const timerDisplay=document.createElement("div");
timerDisplay.style=`position:absolute;top:80px;right:20px;color:#ffffff;font-family:Arial;font-size:18px;z-index:20;`;
document.body.appendChild(timerDisplay);
setInterval(()=>{ if(!dead) timerDisplay.textContent="Temps : "+Math.floor((Date.now()-startTime)/1000)+"s"; },1000);

/* -------- ACHIEVEMENTS -------- */
const achievementBox=document.createElement("div");
achievementBox.style=`position:absolute;top:120px;right:20px;background:rgba(0,0,0,0.8);border:2px solid gold;padding:10px;border-radius:10px;color:gold;font-family:Arial;display:none;z-index:50;`;
document.body.appendChild(achievementBox);
function unlockAchievement(text){ achievementBox.innerHTML="🏆 "+text; achievementBox.style.display="block"; setTimeout(()=>{ achievementBox.style.display="none"; },3000); }
let a1=false,a2=false,a3=false,a4=false;
setInterval(()=>{ if(score>=5&&!a1){a1=true;unlockAchievement("Premier repas !");} if(score>=10&&!a2){a2=true;unlockAchievement("Snake confirmé");} if(score>=20&&!a3){a3=true;unlockAchievement("Machine à pommes");} if(score>=30&&!a4){a4=true;unlockAchievement("Rang SSS atteint");} },100);

/* -------- PROGRESSION -------- */
const progressContainer=document.createElement("div");
progressContainer.style=`position:absolute;top:0;left:0;width:100%;height:8px;background:#111;z-index:30;`;
document.body.appendChild(progressContainer);
const progressBar=document.createElement("div");
progressBar.style=`height:100%;width:0%;background:linear-gradient(90deg,#00ffff,#ff00ff);transition:0.2s;`;
progressContainer.appendChild(progressBar);
setInterval(()=>{ progressBar.style.width=Math.min((score/30)*100,100)+"%"; },100);

/* -------- MESSAGES SCORE -------- */
const scoreMessage=document.createElement("div");
scoreMessage.style=`position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:70px;font-weight:bold;font-family:Arial;color:white;text-shadow:0 0 20px white;opacity:0;transition:0.4s;pointer-events:none;z-index:40;`;
document.body.appendChild(scoreMessage);
let lastMilestone=0;
setInterval(()=>{ if(score>0&&score%10===0&&score!==lastMilestone){ lastMilestone=score; scoreMessage.textContent=score+" POINTS !"; scoreMessage.style.opacity="1"; setTimeout(()=>{ scoreMessage.style.opacity="0"; },1200); } },100);

/* -------- PARTICULES -------- */
const bgCanvas=document.createElement("canvas");
bgCanvas.width=window.innerWidth; bgCanvas.height=window.innerHeight;
bgCanvas.style=`position:fixed;top:0;left:0;pointer-events:none;z-index:-1;`;
document.body.appendChild(bgCanvas);
const bg=bgCanvas.getContext("2d");
const particles=[];
for(let i=0;i<40;i++) particles.push({x:Math.random()*bgCanvas.width,y:Math.random()*bgCanvas.height,r:Math.random()*3+1,dx:(Math.random()-0.5)*0.5,dy:(Math.random()-0.5)*0.5});
function animateBackground(){ bg.clearRect(0,0,bgCanvas.width,bgCanvas.height); particles.forEach(p=>{ p.x+=p.dx; p.y+=p.dy; if(p.x<0||p.x>bgCanvas.width)p.dx*=-1; if(p.y<0||p.y>bgCanvas.height)p.dy*=-1; bg.beginPath(); bg.arc(p.x,p.y,p.r,0,Math.PI*2); bg.fillStyle="rgba(0,255,255,0.25)"; bg.fill(); }); requestAnimationFrame(animateBackground); }
animateBackground();

/* -------- RESET STATS -------- */
document.addEventListener("keydown",(e)=>{
    if(e.key.toLowerCase()==="r"){
        startTime=Date.now(); a1=false;a2=false;a3=false;a4=false;
        lastMilestone=0; fireLevel=0; lastComboScore=0; announcedRecord=false;
    }
});

/* -------- LONGUEUR + COORDS -------- */
const lengthDisplay=document.createElement("div");
lengthDisplay.style=`position:absolute;top:110px;right:20px;color:#00ffff;font-family:Arial;font-size:18px;z-index:20;`;
document.body.appendChild(lengthDisplay);
setInterval(()=>{ lengthDisplay.textContent="Longueur : "+snake.length; },100);
const coordDisplay=document.createElement("div");
coordDisplay.style=`position:absolute;top:140px;right:20px;color:#cccccc;font-family:Arial;font-size:14px;z-index:20;`;
document.body.appendChild(coordDisplay);
setInterval(()=>{ if(snake[0]) coordDisplay.textContent=`X:${snake[0].x} Y:${snake[0].y}`; },100);

/* -------- NOUVEAU RECORD -------- */
const recordMessage=document.createElement("div");
recordMessage.style=`position:absolute;top:25%;left:50%;transform:translateX(-50%);font-size:50px;font-family:Arial;font-weight:bold;color:gold;text-shadow:0 0 20px gold;opacity:0;transition:0.5s;pointer-events:none;z-index:100;`;
document.body.appendChild(recordMessage);
let announcedRecord=false;
setInterval(()=>{ const best=Number(localStorage.getItem("snakeBest"))||0; if(score>best&&!announcedRecord){ announcedRecord=true; recordMessage.textContent="🏆 NOUVEAU RECORD !"; recordMessage.style.opacity="1"; setTimeout(()=>{ recordMessage.style.opacity="0"; },2500); } },100);

window.addEventListener("resize",()=>{
    if(canvas.width>window.innerWidth)  canvas.width=Math.floor(window.innerWidth/box)*box;
    if(canvas.height>window.innerHeight) canvas.height=Math.floor(window.innerHeight/box)*box;
});

/* ==========================================================
   EXTENSION 6 : 20 POWER-UPS
   ========================================================== */

const POWERUP_TYPES = [
    { id:"speed_boost",  label:"SPEED+", color:"#ff8800", duration:5, desc:"Vitesse x2"            },
    { id:"speed_slow",   label:"SLOW",   color:"#00aaff", duration:6, desc:"Vitesse /2"             },
    { id:"ghost",        label:"GHOST",  color:"#aaaaff", duration:5, desc:"Passe murs & obstacles" },
    { id:"invincible",   label:"INV",    color:"#ffff00", duration:4, desc:"Ignore collisions"      },
    { id:"double_score", label:"x2",     color:"#ff00ff", duration:7, desc:"Score x2"               },
    { id:"triple_score", label:"x3",     color:"#ff0088", duration:4, desc:"Score x3"               },
    { id:"magnet",       label:"MAG",    color:"#00ffcc", duration:6, desc:"Attire la nourriture"   },
    { id:"shrink",       label:"SHRINK", color:"#88ff00", duration:0, desc:"Serpent ÷2"             },
    { id:"shield",       label:"SHIELD", color:"#0088ff", duration:8, desc:"Absorbe 1 mort"         },
    { id:"freeze_food",  label:"FREEZE", color:"#88eeff", duration:6, desc:"Nourriture fixe"        },
    { id:"extra_food",   label:"+FOOD",  color:"#ffcc00", duration:8, desc:"+3 nourritures"         },
    { id:"big_head",     label:"BIG",    color:"#ff6600", duration:5, desc:"Portée de collecte x2"  },
    { id:"teleport",     label:"TELE",   color:"#cc00ff", duration:0, desc:"Téléporte la tête"      },
    { id:"bomb",         label:"BOMB",   color:"#ff2200", duration:0, desc:"Détruit obstacles"      },
    { id:"rainbow",      label:"RGB",    color:"#ffffff", duration:6, desc:"+1 score/seconde"       },
    { id:"time_warp",    label:"WARP",   color:"#ff88ff", duration:4, desc:"Bullet time"            },
    { id:"clone_food",   label:"CLONE",  color:"#44ff88", duration:0, desc:"Double la nourriture"   },
    { id:"no_obstacles", label:"CLEAR",  color:"#dddddd", duration:5, desc:"Efface obstacles"       },
    { id:"mini_snake",   label:"MINI",   color:"#ff99cc", duration:5, desc:"Serpent taille mini"    },
];

function spawnPowerUp() {
    if (powerUps.length >= 3) return;
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    powerUps.push({
        x: Math.floor(Math.random() * (canvas.width  / box)) * box,
        y: Math.floor(Math.random() * (canvas.height / box)) * box,
        type, tick: 0
    });
}
setInterval(()=>{ if(!paused&&!dead) spawnPowerUp(); }, 4000);

/* -------- ACTIVATE (timer propre) -------- */
function activate(id, duration, onExpire) {
    const def = POWERUP_TYPES.find(t => t.id === id);
    const boostedDuration = duration * (1 + ((e9perks?.powerup_duration || 0) * 0.3));
activePowerUps[id] = { label: def.label, color: def.color, remaining: boostedDuration, total: boostedDuration };
    const timer = setInterval(() => {
        if (!activePowerUps[id]) { clearInterval(timer); return; }
        activePowerUps[id].remaining -= 0.1;
        if (activePowerUps[id].remaining <= 0) {
            delete activePowerUps[id];
            clearInterval(timer);
            onExpire();
        }
    }, 100);
}

/* -------- APPLY -------- */
function applyPowerUp(type) {
    showPowerUpMessage(type.label + "  —  " + type.desc);
    switch (type.id) {
        case "speed_boost":
            currentSpeed = 40;
            activate("speed_boost", type.duration, () => { currentSpeed = 85; });
            break;
        case "speed_slow":
            currentSpeed = 180;
            activate("speed_slow", type.duration, () => { currentSpeed = 85; });
            break;
        case "ghost":
            ghostActive = true;
            activate("ghost", type.duration, () => { ghostActive = false; });
            break;
        case "invincible":
            invincibleActive = true;
            activate("invincible", type.duration, () => { invincibleActive = false; });
            break;
        case "double_score":
            scoreMultiplier = 2;
            activate("double_score", type.duration, () => { scoreMultiplier = 1; });
            break;
        case "triple_score":
            scoreMultiplier = 3;
            activate("triple_score", type.duration, () => { scoreMultiplier = 1; });
            break;
        case "magnet":
            magnetActive = true;
            activate("magnet", type.duration, () => { magnetActive = false; });
            break;
        case "shrink":
            snake.splice(Math.max(3, Math.floor(snake.length / 2)));
            break;
        case "shield":
            shieldActive = true;
            activate("shield", type.duration, () => { shieldActive = false; });
            break;
        case "freeze_food":
            freezeFoodActive = true;
            activate("freeze_food", type.duration, () => { freezeFoodActive = false; });
            break;
        case "extra_food":
            food.push(spawnFood(), spawnFood(), spawnFood());
            activate("extra_food", type.duration, () => { while(food.length>3) food.pop(); });
            break;
        
        case "big_head":
            bigHeadActive = true;
            activate("big_head", type.duration, () => { bigHeadActive = false; });
            break;
        case "teleport":
            snake[0] = {
                x: Math.floor(Math.random()*(canvas.width /box))*box,
                y: Math.floor(Math.random()*(canvas.height/box))*box
            };
            break;
        case "bomb":
            obstacles.length = 0;
            break;
        case "rainbow":
            rainbowTickActive = true;
            activate("rainbow", type.duration, () => { rainbowTickActive = false; });
            break;
        case "time_warp":
            currentSpeed = 160;
            activate("time_warp", type.duration, () => { currentSpeed = 85; });
            break;
        case "clone_food":
            food.push(...food.map(() => spawnFood()));
            break;
        case "no_obstacles":
            noObstaclesActive = true;
            obstacles.length = 0;
            activate("no_obstacles", type.duration, () => { noObstaclesActive = false; });
            break;
        case "mini_snake":
            snake.splice(5);
            activate("mini_snake", type.duration, () => {});
            break;
        
        case "heart_drop":
    const maxHp2 = 3 + (e9perks.extra_heart || 0) + (e9perks.max_heart || 0);
    if (e8playerHp < maxHp2) {
        e8playerHp++;
        e9updateHpDisplay();
        const newHeart = e9hpBar.children[e8playerHp - 1];
        if (newHeart) {
            newHeart.style.transform = "scale(1.7)";
            newHeart.style.filter = "drop-shadow(0 0 8px #ff2244) drop-shadow(0 0 18px #ff224499)";
            setTimeout(() => {
                newHeart.style.transform = "scale(1.1)";
                newHeart.style.filter = "drop-shadow(0 0 5px #ff2244) drop-shadow(0 0 10px #ff224488)";
            }, 280);
        }
        showPowerUpMessage("❤ +1 CŒUR !");

        if (e11relics.find(r=>r.id==="overload")) {
    score++; scoreDisplay.textContent="Score : "+score;
}
    }
    break;
    }
}

/* -------- RAINBOW +1/s -------- */
setInterval(()=>{
    if(!rainbowTickActive||paused||dead) return;
    score++; scoreDisplay.textContent="Score : "+score; scoreHistory.push(score);
},1000);

/* -------- MAGNET -------- */

/* -------- MESSAGE FLASH -------- */
const puMessage=document.createElement("div");
puMessage.style=`position:absolute;top:18%;left:50%;transform:translateX(-50%);font-size:28px;font-family:Arial;font-weight:bold;color:#fff;text-shadow:0 0 12px #fff;opacity:0;transition:0.35s;pointer-events:none;z-index:60;white-space:nowrap;`;
document.body.appendChild(puMessage);
function showPowerUpMessage(text){
    puMessage.textContent=text; puMessage.style.opacity="1";
    clearTimeout(puMessage._t);
    puMessage._t=setTimeout(()=>{ puMessage.style.opacity="0"; },1600);
}

/* -------- HUD POWER-UPS ACTIFS -------- */
const puHUD=document.createElement("div");
puHUD.style=`position:absolute;top:170px;right:20px;display:flex;flex-direction:column;gap:5px;z-index:30;pointer-events:none;`;
document.body.appendChild(puHUD);
setInterval(()=>{
    puHUD.innerHTML="";
    for(const id in activePowerUps){
        const pu=activePowerUps[id];
        const sec=Math.ceil(pu.remaining);
        const pct=Math.max(0,(pu.remaining/pu.total)*100);
        const row=document.createElement("div");
        row.style.cssText=`background:rgba(0,0,0,0.78);border:1px solid ${pu.color};border-radius:6px;padding:4px 8px;min-width:115px;`;
        row.innerHTML=`
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
                <span style="color:${pu.color};font-family:Arial;font-size:13px;font-weight:bold;">${pu.label}</span>
                <span style="color:#fff;font-family:Arial;font-size:13px;">${sec}s</span>
            </div>
            <div style="background:#222;border-radius:3px;height:4px;">
                <div style="height:4px;width:${pct.toFixed(1)}%;background:${pu.color};border-radius:3px;"></div>
            </div>`;
        puHUD.appendChild(row);
    }
},100);

/* ==========================================================
   FIN EXTENSION 6
   ========================================================== */

   

   /* ==========================================================
   EXTENSION 8 : GAMEPLAY + VISUEL
   ========================================================== */

/* -------- ÉTAT EXT8 -------- */

let e8playerHp = 3;
let e8bossHitCooldown = 0;
let e8level        = 1;
let e8xp           = 0;
let e8xpNext       = 10;
let e8coins        = 0;
let e8skin         = "default";   // skin actif
let e8trail        = [];          // historique positions pour le trail
let e8portalA      = null;
let e8portalB      = null;
let e8portalTick   = 0;
let e8bossActive   = false;
let e8boss         = null;
let e8bossHp       = 0;
let e8bossMaxHp    = 0;


let e8bossProjectiles = [];
let e8bossAttackTimer = 0;
let e8bossAttackCooldown = 90;

let e8bossAttackType = null;
let e8bossTelegraph = 0;

let e8laser = null;
let e8dashTrail = [];
let e8particles    = [];          // particules générales
let e8deathParts   = [];          // particules de mort
let e8screenShake  = 0;
let e8theme        = "cyber";     // cyber | void | forest | blood

let e8survivalMode = false;
let e8survivalTime = 0;
let e8survivalTick = 0;
let e8waveNum      = 0;
let e8mapEffects   = [];          // effets visuels sur la map
let e8skinUnlocked = ["default","neon","fire","ice","gold","shadow","rainbow","plasma"];

/* -------- SKINS -------- */
const E8_SKINS = {
    default: (i,hue) => `hsl(${hue+i*10},100%,60%)`,
    neon:    (i)     => `hsl(${120+i*5},100%,65%)`,
    fire:    (i)     => `hsl(${i*4},100%,55%)`,
    ice:     (i)     => `hsl(${190+i*3},80%,70%)`,
    gold:    (i)     => `hsl(${45+i*2},100%,${50+i*1.5}%)`,
    shadow:  (i)     => `hsl(270,${60-i*2}%,${40+i*2}%)`,
    rainbow: (i,hue) => `hsl(${hue+i*20},100%,60%)`,
    plasma:  (i,hue) => `hsl(${hue+i*15},100%,${55+Math.sin(i*0.5)*15}%)`,
};

/* -------- THÈMES -------- */
const E8_THEMES = {
    cyber:  { bg:"#050010", grid:"#00ffff08", obs:"#00ffff", food:`hsl(180,100%,60%)` },
    void:   { bg:"#000000", grid:"#ffffff05", obs:"#ffffff", food:`hsl(280,100%,70%)` },
    forest: { bg:"#001a00", grid:"#00ff0010", obs:"#22ff22", food:`hsl(100,100%,55%)` },
    blood:  { bg:"#1a0000", grid:"#ff000010", obs:"#ff2222", food:`hsl(0,100%,55%)`   },
};

/* -------- NIVEAUX -------- */
function e8gainXp(amount) {
    e8xp += amount;
    while (e8xp >= e8xpNext) {
        e8xp -= e8xpNext;
        e8level++;
        e8xpNext = Math.floor(e8xpNext * 1.4);
        e8coins += 5;
        e8showNotif(`⬆ NIVEAU ${e8level} !`, "#ffff00");
        e8spawnLevelEffect();
    }
}

/* -------- PORTAILS -------- */
function e8spawnPortals() {
    e8portalA = {
        x: Math.floor(Math.random()*(canvas.width /box))*box,
        y: Math.floor(Math.random()*(canvas.height/box))*box
    };
    e8portalB = {
        x: Math.floor(Math.random()*(canvas.width /box))*box,
        y: Math.floor(Math.random()*(canvas.height/box))*box
    };
}

function e8checkPortal(head) {
    if (!e8portalA || !e8portalB) return;
    if (head.x===e8portalA.x && head.y===e8portalA.y) {
        snake[0].x = e8portalB.x; snake[0].y = e8portalB.y;
        e8screenShake = 8;
        e8spawnBurst(e8portalB.x+box/2, e8portalB.y+box/2, "#cc00ff", 12);
        e8spawnPortals();

        if (e9perks.portal_boost > 0) { score += e9perks.portal_boost; scoreDisplay.textContent = "Score : " + score; }
if (e9perks.xp_on_portal > 0) e8gainXp(3 * e9perks.xp_on_portal);
if (e9perks.score_on_portal > 0) { score += e9perks.score_on_portal; scoreDisplay.textContent = "Score : " + score; }
    } else if (head.x===e8portalB.x && head.y===e8portalB.y) {
        snake[0].x = e8portalA.x; snake[0].y = e8portalA.y;
        e8screenShake = 8;
        e8spawnBurst(e8portalA.x+box/2, e8portalA.y+box/2, "#cc00ff", 12);
        e8spawnPortals();
    }
}

/* -------- BOSS -------- */
function e8spawnBoss() {
    e8bossActive = true;
    e8bossMaxHp = Math.max(2, 5 + e8level * 2 - (e9perks.boss_weakener || 0) * 2);
    e8bossHp     = e8bossMaxHp;
    e8boss = {
        x: Math.floor(canvas.width  / 2 / box) * box,
        y: Math.floor(canvas.height / 2 / box) * box,
        dx: box, dy: 0, tick: 0, phase: 0
    };
    e8showNotif("👾 BOSS APPARU !", "#ff0000");
    e8screenShake = 15;
}

function e8updateBoss() {
    if (!e8bossActive || !e8boss) return;
    e8boss.tick++;
    if (e8boss.tick % 18 !== 0) return;

    // Le boss se déplace vers le serpent
    if (!snake[0]) return;
    const dx = snake[0].x - e8boss.x;
    const dy = snake[0].y - e8boss.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
        e8boss.x += Math.sign(dx) * box;
    } else {
        e8boss.y += Math.sign(dy) * box;
    }

    if (e8boss.tick % Math.round(18 * (1 + (e9perks.boss_slow||0) * 0.3)) !== 0) return;

    // Collision boss + tête
if (
    snake[0] &&
    Math.abs(e8boss.x - snake[0].x) <= box &&
    Math.abs(e8boss.y - snake[0].y) <= box &&
    e8bossHitCooldown <= 0
) {

    if (invincibleActive) return;

    if (shieldActive) {
        shieldActive = false;
        delete activePowerUps["shield"];
        showPowerUpMessage("🛡 BOUCLIER BRISÉ !");
        e8bossHitCooldown = 60;
        return;
    }

    e8playerHp--;
    e8bossHitCooldown = 60;

    e8screenShake = 15;

    e8spawnBurst(
        snake[0].x + box/2,
        snake[0].y + box/2,
        "#ff0000",
        20
    );

    e8showNotif(
        `💔 PV : ${e8playerHp}`,
        "#ff4444"
    );

    if (e8playerHp <= 0) {
        showDeath();
    }
}

    // Collision boss + nourriture mangée par serpent → boss perd HP
    // géré dans e8checkBossHit()
}

function e8updateBossAttacks() {

    if(!e8bossActive)
        return;

    e8bossAttackTimer++;

    if(
        e8bossAttackTimer >
        e8bossAttackCooldown
    ){

        e8bossAttackTimer = 0;

        e8bossChooseAttack();
    }

    if(
        e8bossTelegraph > 0
    ){

        e8bossTelegraph--;

        if(
            e8bossTelegraph === 0
        ){
            e8bossExecuteAttack();
        }
    }

    for(
        let i=e8bossProjectiles.length-1;
        i>=0;
        i--
    ){

        const p =
            e8bossProjectiles[i];

        p.x += p.dx * box * 1.8;
        p.y += p.dy * box * 1.8;

        if(
            snake[0] &&
            Math.abs(snake[0].x - p.x) < box * 3.5 &&
            Math.abs(snake[0].y - p.y) < box * 3.5
        ){

            if (e9perks.dash_immunity > 0 && p.type === "dash") continue;

            e8damagePlayer(1);

            e8bossProjectiles.splice(i,1);

            continue;
        }

        if(
            p.x < 0 ||
            p.y < 0 ||
            p.x > canvas.width ||
            p.y > canvas.height
        ){
            e8bossProjectiles.splice(i,1);
        }
    }

    if(e8laser){

        if (!(e9perks.laser_immunity > 0)) {
    e8laser.damageTick++;
    if(e8laser.damageTick >= e8laser.damageInterval){ e8damagePlayer(1); e8laser.damageTick=0; }
}

        e8laser.life--;

        if(
    snake[0] &&
    Math.abs(snake[0].y - e8laser.y) <= box * 1.5
){
    e8laser.damageTick++;
    if(e8laser.damageTick >= e8laser.damageInterval){
        e8damagePlayer(1);
        e8laser.damageTick = 0;
    }
}

        if(
            e8laser.life <= 0
        ){
            e8laser = null;
        }
    }

    e8dashTrail.forEach(t=>t.life--);

    e8dashTrail =
        e8dashTrail.filter(
            t=>t.life>0
        );

        // Bounce update
e8updateBounce();
}

function e8bossChooseAttack() {

    if (!e8bossActive) return;

    const maxAttacks = 6;
    e8bossAttackType = Math.floor(Math.random() * maxAttacks);

    e8bossTelegraph = 10;

    const names = [
        "🌵 PICS",
        "🔥 FEU",
        "⚡ LASER",
        "💀 NOVA",
        "🌪 DASH",
        "🔮 BOUNCE"
    ];

    e8showNotif(
        "⚠ " + names[e8bossAttackType],
        "#ff8800"
    );
}

function e8bossExecuteAttack() {

    switch (e8bossAttackType) {

        case 0:
            e8attackSpikes();
            break;

        case 1:
            e8attackFireball();
            break;

        case 2:
            e8attackLaser();
            break;

        case 3:
            e8attackNova();
            break;

        case 4:
            e8attackDash();
            break;
        case 5:
            e8attackBounce();
            break;
    }
}

function e8attackSpikes() {

    const dirs = [
        [1,0],
        [-1,0],
        [0,1],
        [0,-1]
    ];

    dirs.forEach(d => {

        e8bossProjectiles.push({

            x:e8boss.x,
            y:e8boss.y,

            dx:d[0],
            dy:d[1],

            color:"#ffaa00",
            type:"spike"
        });

    });

}

function e8attackLaser() {
    if (!snake[0]) return;

    e8laser = {
    y: snake[0].y,
    life: 40,
    damageTick: 0,
    damageInterval: 25
};
}

function e8attackFireball() {

    const dx = Math.sign(
        snake[0].x - e8boss.x
    );

    const dy = Math.sign(
        snake[0].y - e8boss.y
    );

    e8bossProjectiles.push({

        x:e8boss.x,
        y:e8boss.y,

        dx,
        dy,

        color:"#ff3300",
        type:"fire"

    });

}

function e8attackNova() {

    for(let x=-1;x<=1;x++) {

        for(let y=-1;y<=1;y++) {

            if(x===0 && y===0)
                continue;

            e8bossProjectiles.push({

                x:e8boss.x,
                y:e8boss.y,

                dx:x,
                dy:y,

                color:"#ff00ff",
                type:"nova"

            });

        }

    }

}

function e8attackDash() {
    if (!e8boss || !snake[0]) return;

    const dx = Math.sign(snake[0].x - e8boss.x);
    const dy = Math.sign(snake[0].y - e8boss.y);

    const dashSteps = Math.floor((canvas.width / 2) / box);
for (let i = 0; i < dashSteps; i++) {// ↓ 5 → 3 pour éviter freeze

        e8dashTrail.push({
            x: e8boss.x,
            y: e8boss.y,
            life: 30
        });

        e8boss.x += dx * box;
        e8boss.y += dy * box;

        // sécurité map
        e8boss.x = Math.max(0, Math.min(canvas.width - box, e8boss.x));
        e8boss.y = Math.max(0, Math.min(canvas.height - box, e8boss.y));
    }

    if (snake[0].x === e8boss.x && snake[0].y === e8boss.y) {
        e8damagePlayer(1);
    }
}

function e8attackBounce() {
    if (!e8boss) return;

    // Sauvegarde l'état normal du boss
    const bounceState = {
        active: true,
        ticks:  0,
        maxTicks: 120,        // durée totale : ~2s à 60fps
        vx: (Math.random() > 0.5 ? 1 : -1) * box,
        vy: (Math.random() > 0.5 ? 1 : -1) * box,
        trailPositions: []
    };
    e8boss._bounce = bounceState;
}

function e8updateBounce() {
    if (!e8boss || !e8boss._bounce || !e8boss._bounce.active) return;

    const b = e8boss._bounce;
    b.ticks++;

    // Enregistre la position pour le trail
    b.trailPositions.push({ x: e8boss.x, y: e8boss.y });
    if (b.trailPositions.length > 10) b.trailPositions.shift();

    // Déplacement
    e8boss.x += b.vx;
    e8boss.y += b.vy;

    // Rebond sur les murs
    if (e8boss.x <= 0 || e8boss.x >= canvas.width - box) {
        b.vx *= -1;
        e8boss.x = Math.max(0, Math.min(canvas.width - box, e8boss.x));
        e8screenShake = 6;
        e8spawnBurst(e8boss.x + box/2, e8boss.y + box/2, "#ff00ff", 8);
    }
    if (e8boss.y <= 0 || e8boss.y >= canvas.height - box) {
        b.vy *= -1;
        e8boss.y = Math.max(0, Math.min(canvas.height - box, e8boss.y));
        e8screenShake = 6;
        e8spawnBurst(e8boss.x + box/2, e8boss.y + box/2, "#ff00ff", 8);
    }

    // Snap sur la grille pour que la hitbox reste cohérente
    e8boss.x = Math.round(e8boss.x / box) * box;
    e8boss.y = Math.round(e8boss.y / box) * box;

    // Collision avec le serpent pendant le bounce
    if (
        snake[0] &&
        Math.abs(e8boss.x - snake[0].x) <= box &&
        Math.abs(e8boss.y - snake[0].y) <= box &&
        e8bossHitCooldown <= 0
    ) {

        if (e9perks.bounce_immunity > 0) { e8bossHitCooldown=30; } else {
        e8damagePlayer(1);
        e8bossHitCooldown = 30; // cooldown plus court pendant le bounce
    }
}

    if (e8bossHitCooldown > 0) e8bossHitCooldown--;

    // Fin du bounce
    if (b.ticks >= b.maxTicks) {
        b.active = false;
        e8boss._bounce = null;
        e8showNotif("👾 BOUNCE TERMINÉ", "#ff00ff");
        e8screenShake = 12;
    }
}

function e8drawBounce() {
    if (!e8boss || !e8boss._bounce || !e8boss._bounce.active) return;

    const b = e8boss._bounce;

    // Trail arc-en-ciel
    b.trailPositions.forEach((pos, i) => {
        const alpha  = (i / b.trailPositions.length) * 0.6;
        const hshift = (i / b.trailPositions.length) * 120;
        ctx.globalAlpha = alpha;
        ctx.fillStyle   = `hsl(${(hue + hshift) % 360},100%,60%)`;
        ctx.shadowColor = `hsl(${(hue + hshift) % 360},100%,60%)`;
        ctx.shadowBlur  = 12;
        const size = box * (0.4 + 0.6 * (i / b.trailPositions.length));
        ctx.beginPath();
        ctx.arc(pos.x + box/2, pos.y + box/2, size / 2, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.globalAlpha = 1;
    ctx.shadowBlur  = 0;

    // Indicateur de durée restante (cercle qui se vide)
    const cx = e8boss.x + box / 2;
    const cy = e8boss.y + box / 2;
    const ratio = 1 - (b.ticks / b.maxTicks);
    ctx.beginPath();
    ctx.arc(cx, cy, box * 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
    ctx.strokeStyle = `hsl(${hue},100%,60%)`;
    ctx.lineWidth   = 3;
    ctx.shadowColor = `hsl(${hue},100%,60%)`;
    ctx.shadowBlur  = 10;
    ctx.stroke();
    ctx.shadowBlur  = 0;

    // Texte BOUNCE clignotant
    if (Math.floor(b.ticks / 8) % 2 === 0) {
        ctx.fillStyle    = "#ff00ff";
        ctx.font         = "bold 10px Arial";
        ctx.textAlign    = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("BOUNCE", cx, cy - box * 2.5);
        ctx.textBaseline = "alphabetic";
        ctx.textAlign    = "left";
    }
}



function e8checkBossHit(head) {
    if (!e8bossActive || !e8boss) return;
    if (Math.abs(head.x - e8boss.x) <= box && Math.abs(head.y - e8boss.y) <= box) {
        e8bossHp--;
        e8screenShake = 10;

        // 👉 RETIRE 1 SEGMENT DU SERPENT
if (snake.length > 1) {
    snake.pop();
} else {
    // si plus qu’une tête → mort immédiate
    showDeath();
    return;
}
        e8spawnBurst(e8boss.x+box/2, e8boss.y+box/2, "#ff4444", 10);
        if (e8bossHp <= 0) {
            e8bossActive = false;
            e8boss = null;
            score += 5;

            // score_on_kill
score += (e9perks.score_on_kill || 0) * 10;
scoreDisplay.textContent = "Score : " + score;
// coin_on_kill
e8coins += (e9perks.coin_on_kill || 0) * 20;
            e8coins += 10;
            e8gainXp(20 * (1 + (e9perks?.xp_on_kill || 0)));
            e8showNotif("👾 BOSS VAINCU ! +5 pts +10 coins", "#ff00ff");
            e8screenShake = 20;
            e8spawnBurst(canvas.width/2, canvas.height/2, "#ff00ff", 40);

            // Drop cœur si HP pas max
const maxHp = 3 + (e9perks.extra_heart || 0) + (e9perks.max_heart || 0);
if (e8playerHp < maxHp || e9perks.mini_boss_loot > 0) {
    powerUps.push({
        x: e8boss ? e8boss.x : Math.floor(Math.random() * (canvas.width  / box)) * box,
        y: e8boss ? e8boss.y : Math.floor(Math.random() * (canvas.height / box)) * box,
        type: {
            id:    "heart_drop",
            label: "❤+1",
            color: "#ff4466",
            desc:  "Récupère 1 cœur"
        },
        tick: 0
    });
}
        }
    }
}

function e8damagePlayer(amount = 1) {

    if (invincibleActive) return;

    if (shieldActive) {
        shieldActive = false;
        delete activePowerUps["shield"];
        showPowerUpMessage("🛡 BOUCLIER BRISÉ !");
        return;
    }

    if (e9perks.time_slow > 0 && e8playerHp <= 1) {
    currentSpeed = e9perks.time_slow >= 2 ? 220 : 160;
    setTimeout(() => {
        if (!dead) currentSpeed = Math.max(35, 85 - (e9perks.speed_up || 0) * 8);
    }, 3000);
}

    e8playerHp -= amount;

    if (e11relics.find(r=>r.id==="rich_blood")) {
    e8coins += 5 * amount;
    showPowerUpMessage("💉 SANG RICHE +5 🪙");
}

    e8screenShake = 15;

    e8spawnBurst(
        snake[0].x + box/2,
        snake[0].y + box/2,
        "#ff0000",
        15
    );

    e8showNotif(
        `💔 -${amount} PV`,
        "#ff4444"
    );

    if (e8playerHp <= 0) {
        showDeath();
    }
}

/* -------- PARTICULES -------- */
function e8spawnBurst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 4;
        e8particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            decay: 0.03 + Math.random() * 0.04,
            size: 2 + Math.random() * 5,
            color
        });
    }
}

function e8spawnDeathBurst() {
    snake.forEach((seg, i) => {
        setTimeout(() => {
            e8spawnBurst(seg.x + box/2, seg.y + box/2,
                `hsl(${hue + i*10},100%,60%)`, 6);
        }, i * 15);
    });
}

function e8updateParticles() {
    for (let i = e8particles.length - 1; i >= 0; i--) {
        const p = e8particles[i];
        p.x += p.vx; p.y += p.vy;
        p.vy += 0.08;
        p.life -= p.decay;
        if (p.life <= 0) e8particles.splice(i, 1);
    }
}

function e8drawParticles() {
    e8particles.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle   = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur  = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI*2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur  = 0;
}

/* -------- TRAIL -------- */
function e8drawTrail() {
    if (snake.length === 0) return;
    e8trail.unshift({ x: snake[0].x, y: snake[0].y, hue });
    if (e8trail.length > 18) e8trail.pop();
    e8trail.forEach((t, i) => {
        const alpha = (1 - i / e8trail.length) * 0.35;
        const size  = box * (1 - i / e8trail.length) * 0.7;
        ctx.globalAlpha = alpha;
        ctx.fillStyle   = E8_SKINS[e8skin](i, t.hue);
        ctx.shadowColor = E8_SKINS[e8skin](i, t.hue);
        ctx.shadowBlur  = 10;
        ctx.fillRect(t.x + (box-size)/2, t.y + (box-size)/2, size, size);
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur  = 0;
}

/* -------- GRILLE -------- */
function e8drawGrid() {
    const theme = E8_THEMES[e8theme];
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth   = 0.5;
    for (let x = 0; x <= canvas.width;  x += box) {
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += box) {
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke();
    }
}

/* -------- PORTAILS DRAW -------- */
function e8drawPortals() {
    if (!e8portalA || !e8portalB) return;
    e8portalTick++;
    [[e8portalA,"#cc00ff"],[e8portalB,"#00ccff"]].forEach(([p,col]) => {
        const cx = p.x+box/2, cy = p.y+box/2;
        const pulse = 1 + 0.3 * Math.sin(e8portalTick * 0.1);
        ctx.beginPath();
        ctx.arc(cx, cy, box*0.9*pulse, 0, Math.PI*2);
        ctx.strokeStyle = col;
        ctx.shadowColor = col; ctx.shadowBlur = 20;
        ctx.lineWidth   = 3; ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, box*0.45*pulse, 0, Math.PI*2);
        ctx.fillStyle   = col + "44";
        ctx.fill();
        ctx.shadowBlur  = 0;
        ctx.fillStyle   = col;
        ctx.font        = `bold 9px Arial`;
        ctx.textAlign   = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("TELE", cx, cy);
        ctx.textBaseline = "alphabetic";
    });
}

/* -------- BOSS DRAW -------- */
/* -------- BOSS DRAW (refonte visuelle) -------- */
function e8drawBoss() {
    if (!e8bossActive || !e8boss) return;
    const cx = e8boss.x + box / 2;
    const cy = e8boss.y + box / 2;
    const t  = e8boss.tick;
    const pulse = 1 + 0.18 * Math.sin(t * 0.12);
    const pulseAura = 1 + 0.35 * Math.sin(t * 0.08);

    // === Aura extérieure ===
    const auraGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, box * 3.5 * pulseAura);
    auraGrad.addColorStop(0,   "rgba(255,34,0,0.35)");
    auraGrad.addColorStop(0.5, "rgba(255,100,0,0.12)");
    auraGrad.addColorStop(1,   "rgba(255,34,0,0)");
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, box * 3.5 * pulseAura, 0, Math.PI * 2);
    ctx.fill();

    // === Anneau orbitaire : éclats rotatifs ===
    const orbitR = box * 2.4;
    for (let i = 0; i < 4; i++) {
        const angle = (Math.PI / 2) * i + t * 0.04;
        const ox = cx + Math.cos(angle) * orbitR;
        const oy = cy + Math.sin(angle) * orbitR;
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(t * 0.08 + i);
        const shardSize = box * 0.45;
        ctx.beginPath();
        ctx.moveTo(0, -shardSize);
        ctx.lineTo(shardSize * 0.5, shardSize * 0.7);
        ctx.lineTo(-shardSize * 0.5, shardSize * 0.7);
        ctx.closePath();
        ctx.fillStyle = i % 2 === 0 ? "#ff6600" : "#ffaa00";
        ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 0.15 + i);
        ctx.shadowColor = "#ff4400";
        ctx.shadowBlur  = 10;
        ctx.fill();
        ctx.restore();
    }

    // === Anneau orbitaire 2 : diamants en sens inverse ===
    const orbitR2 = box * 3.0;
    for (let i = 0; i < 4; i++) {
        const angle = (Math.PI / 2) * i - t * 0.025 + Math.PI / 4;
        const ox = cx + Math.cos(angle) * orbitR2;
        const oy = cy + Math.sin(angle) * orbitR2;
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(t * 0.06);
        const d = box * 0.3;
        ctx.beginPath();
        ctx.moveTo(0, -d); ctx.lineTo(d, 0);
        ctx.lineTo(0, d);  ctx.lineTo(-d, 0);
        ctx.closePath();
        ctx.fillStyle = "#ff8800";
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 0.1 + i * 1.2);
        ctx.shadowColor = "#ffaa00";
        ctx.shadowBlur  = 8;
        ctx.fill();
        ctx.restore();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur  = 0;

    // === Corps hexagonal ===
    const bw = box * 1.5 * pulse;
    const bh = box * 1.5 * pulse;
    const sides = 6;

    // Ombre portée
    ctx.shadowColor = "#ff2200";
    ctx.shadowBlur  = 28;

    // Corps principal
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        const x = cx + bw * Math.cos(a);
        const y = cy + bh * Math.sin(a);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();

    const bodyGrad = ctx.createRadialGradient(cx - bw * 0.2, cy - bh * 0.2, 0, cx, cy, bw);
    bodyGrad.addColorStop(0,   "#ff6622");
    bodyGrad.addColorStop(0.5, "#cc1100");
    bodyGrad.addColorStop(1,   "#550000");
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // Bordure hexagonale
    ctx.strokeStyle = "#ff4400";
    ctx.lineWidth   = 2;
    ctx.stroke();
    ctx.shadowBlur  = 0;

    // Lignes internes (craquelures)
    ctx.strokeStyle = "rgba(255,136,34,0.4)";
    ctx.lineWidth   = 0.8;
    [[0, -bh * 0.6, 0, bh * 0.6],
     [-bw * 0.5, -bh * 0.4, bw * 0.5, bh * 0.4],
     [-bw * 0.5, bh * 0.4, bw * 0.5, -bh * 0.4]
    ].forEach(([x1, y1, x2, y2]) => {
        ctx.beginPath();
        ctx.moveTo(cx + x1, cy + y1);
        ctx.lineTo(cx + x2, cy + y2);
        ctx.stroke();
    });

    // === Yeux ===
    const eyeOffsets = [[-bw * 0.28, -bh * 0.18], [bw * 0.28, -bh * 0.18]];
    eyeOffsets.forEach(([ex, ey]) => {
        const ex2 = cx + ex, ey2 = cy + ey;
        const eyeR = box * 0.35;

        // Fond œil
        const eyeGrad = ctx.createRadialGradient(ex2 - 1, ey2 - 1, 0, ex2, ey2, eyeR);
        eyeGrad.addColorStop(0,   "#ffff44");
        eyeGrad.addColorStop(0.5, "#ff4400");
        eyeGrad.addColorStop(1,   "#220000");
        ctx.beginPath();
        ctx.arc(ex2, ey2, eyeR, 0, Math.PI * 2);
        ctx.fillStyle = eyeGrad;
        ctx.shadowColor = "#ff8800";
        ctx.shadowBlur  = 12 + 8 * Math.sin(t * 0.15);
        ctx.fill();

        // Pupille verticale
        ctx.fillStyle = "#1a0000";
        ctx.beginPath();
        ctx.arc(ex2, ey2, eyeR * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,34,0,${0.7 + 0.3 * Math.sin(t * 0.1)})`;
        ctx.beginPath();
        ctx.ellipse(ex2, ey2, eyeR * 0.15, eyeR * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.shadowBlur = 0;

    // === Bouche dentée ===
    const mouthY = cy + bh * 0.28;
    const mouthX1 = cx - bw * 0.38, mouthX2 = cx + bw * 0.38;
    const teeth = 5;
    const step  = (mouthX2 - mouthX1) / teeth;
    ctx.beginPath();
    ctx.moveTo(mouthX1, mouthY);
    for (let i = 0; i < teeth; i++) {
        const tx = mouthX1 + step * i;
        ctx.lineTo(tx + step * 0.5, mouthY - box * 0.22);
        ctx.lineTo(tx + step, mouthY);
    }
    ctx.strokeStyle = "#ff2200";
    ctx.lineWidth   = 2;
    ctx.lineJoin    = "round";
    ctx.stroke();

    // === Barre HP ===
    const hpRatio = e8bossHp / e8bossMaxHp;
    const barW = box * 4.5, barH = 7;
    const barX = cx - barW / 2, barY = e8boss.y - 20;

    ctx.fillStyle = "#220000";
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 3);
    ctx.fill();

    // Couleur HP dégradée selon la vie restante
    const hpColor = hpRatio > 0.6 ? "#00ff44" : hpRatio > 0.3 ? "#ffaa00" : "#ff2200";
    ctx.shadowColor = hpColor;
    ctx.shadowBlur  = 8;
    ctx.fillStyle   = hpColor;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * hpRatio, barH, 3);
    ctx.fill();
    ctx.shadowBlur  = 0;

    ctx.strokeStyle = "#ff4400";
    ctx.lineWidth   = 0.8;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 3);
    ctx.stroke();

    // Phase indicator
    const phase = e8bossHp > e8bossMaxHp * 0.5 ? "I" : "II";
    ctx.fillStyle    = "#ffaa00";
    ctx.font         = "bold 9px Arial";
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`PHASE ${phase}  ${e8bossHp}/${e8bossMaxHp}`, cx, barY - 7);
    ctx.textBaseline = "alphabetic";
    ctx.textAlign    = "left";
}

function e8drawBossAttacks() {
    const t = Date.now() * 0.003;

    // === Projectiles ===
    e8bossProjectiles.forEach(p => {
        const cx = p.x + box / 2;
        const cy = p.y + box / 2;
        ctx.save();

        if (p.type === "spike") {
            // Étoile à 5 branches
            ctx.shadowColor = p.color;
            ctx.shadowBlur  = 14;
            ctx.fillStyle   = p.color;
            ctx.beginPath();
            for (let i = 0; i < 10; i++) {
                const a = (Math.PI / 5) * i - Math.PI / 2;
                const r = i % 2 === 0 ? box * 0.7 : box * 0.3;
                i === 0
                    ? ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
                    : ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.fill();

        } else if (p.type === "fire") {
            // Boule de feu avec halo
            const g = ctx.createRadialGradient(cx - 2, cy - 2, 0, cx, cy, box * 0.8);
            g.addColorStop(0,   "#ffdd00");
            g.addColorStop(0.4, "#ff5500");
            g.addColorStop(1,   "rgba(255,0,0,0)");
            ctx.fillStyle  = g;
            ctx.shadowColor = "#ff4400";
            ctx.shadowBlur  = 20;
            ctx.beginPath();
            ctx.arc(cx, cy, box * 0.8, 0, Math.PI * 2);
            ctx.fill();

        } else if (p.type === "nova") {
            // Diamant rotatif
            ctx.translate(cx, cy);
            ctx.rotate(t * 2);
            ctx.shadowColor = p.color;
            ctx.shadowBlur  = 16;
            ctx.fillStyle   = p.color;
            const d = box * 0.55;
            ctx.beginPath();
            ctx.moveTo(0, -d); ctx.lineTo(d, 0);
            ctx.lineTo(0, d);  ctx.lineTo(-d, 0);
            ctx.closePath();
            ctx.fill();
            // Anneau intérieur
            ctx.strokeStyle = "#ff88ff";
            ctx.lineWidth   = 1;
            ctx.globalAlpha = 0.5;
            ctx.stroke();
        }

        ctx.restore();
        ctx.globalAlpha = 1;
        ctx.shadowBlur  = 0;
    });

    // === Laser : ligne + glow multicouche ===
    if (e8laser) {
        const lifeRatio = e8laser.life / 40;
        const ly = e8laser.y + box / 2;

        // Couche glow large
        ctx.strokeStyle = `rgba(255,0,0,${lifeRatio * 0.3})`;
        ctx.lineWidth   = 28;
        ctx.beginPath();
        ctx.moveTo(0, ly); ctx.lineTo(canvas.width, ly);
        ctx.stroke();

        // Couche intermédiaire
        ctx.strokeStyle = `rgba(255,100,0,${lifeRatio * 0.5})`;
        ctx.lineWidth   = 10;
        ctx.stroke();

        // Cœur du laser
        ctx.shadowColor = "#ff2200";
        ctx.shadowBlur  = 20;
        ctx.strokeStyle = `rgba(255,255,200,${lifeRatio * 0.95})`;
        ctx.lineWidth   = 2.5;
        ctx.stroke();
        ctx.shadowBlur  = 0;

        // Texte d'avertissement
        ctx.fillStyle    = `rgba(255,80,0,${lifeRatio * 0.8})`;
        ctx.font         = `bold ${Math.round(box * 0.55)}px Arial`;
        ctx.textAlign    = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText("⚡ LASER ⚡", canvas.width / 2, ly - 6);
        ctx.textBaseline = "alphabetic";
        ctx.textAlign    = "left";
    }

    // === Dash trail : fondu avec forme losange ===
    e8dashTrail.forEach((trail, i) => {
        const alpha = (trail.life / 30) * 0.6;
        ctx.globalAlpha = alpha;
        ctx.fillStyle   = `hsl(${30 + i * 5},100%,55%)`;
        ctx.shadowColor = "#ff8800";
        ctx.shadowBlur  = 8;
        // Losange au lieu d'un simple carré
        ctx.save();
        ctx.translate(trail.x + box / 2, trail.y + box / 2);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-box * 0.35, -box * 0.35, box * 0.7, box * 0.7);
        ctx.restore();
    });

    ctx.globalAlpha = 1;
    ctx.shadowBlur  = 0;

    // Bounce draw
e8drawBounce();
}

/* -------- SCREEN SHAKE -------- */
function e8applyShake() {
    if (e8screenShake <= 0) { canvas.style.transform="none"; return; }
    const s = e8screenShake;
    canvas.style.transform = `translate(${(Math.random()-0.5)*s}px,${(Math.random()-0.5)*s}px)`;
    e8screenShake = Math.max(0, e8screenShake - 1.5);
}

/* -------- EFFETS DE NIVEAU -------- */
function e8spawnLevelEffect() {
    for (let i=0; i<30; i++) {
        e8spawnBurst(
            Math.random()*canvas.width,
            Math.random()*canvas.height,
            `hsl(${Math.random()*360},100%,60%)`, 1
        );
    }
}

/* -------- SURVIE MODE -------- */
function e8startSurvival() {
    e8survivalMode = true;
    e8survivalTime = 30;
    e8waveNum++;
    e8showNotif(`⚡ VAGUE ${e8waveNum} — ${e8survivalTime}s !`, "#ff8800");
}



/* -------- NOTIF CENTRE -------- */
const e8notifEl = document.createElement("div");
e8notifEl.style.cssText = `
    position:absolute;top:30%;left:50%;transform:translateX(-50%);
    font-size:24px;font-family:Arial;font-weight:bold;
    color:#fff;text-shadow:0 0 15px #fff;
    opacity:0;transition:0.3s;pointer-events:none;z-index:70;
    white-space:nowrap;text-align:center;
`;
document.body.appendChild(e8notifEl);

function e8showNotif(text, color) {
    e8notifEl.textContent = text;
    e8notifEl.style.color = color;
    e8notifEl.style.textShadow = `0 0 15px ${color}`;
    e8notifEl.style.opacity = "1";
    clearTimeout(e8notifEl._t);
    e8notifEl._t = setTimeout(() => { e8notifEl.style.opacity = "0"; }, 1800);
}

/* -------- HUD EXT8 (bas gauche) -------- */
const e8hud = document.createElement("div");
e8hud.style.cssText = `
    position:absolute;bottom:15px;right:15px;
    background:rgba(0,0,0,0.8);
    border:1px solid #ffffff22;
    border-radius:10px;padding:8px 12px;
    font-family:Arial;font-size:12px;
    color:white;z-index:20;pointer-events:none;
    min-width:130px;
`;
document.body.appendChild(e8hud);

/* -------- SÉLECTEUR SKIN + THÈME -------- */
const e8panel = document.createElement("div");
e8panel.style.cssText = `
    position:absolute;bottom:15px;left:50%;transform:translateX(-50%);
    background:rgba(0,0,0,0.88);
    border:1px solid #00ffff44;border-radius:10px;
    padding:8px 14px;display:flex;gap:10px;align-items:center;
    font-family:Arial;font-size:11px;color:#ffffff88;z-index:20;
`;
e8panel.innerHTML = `
    <span style="letter-spacing:1px;">SKIN</span>
    <select id="e8skinSel" style="background:#000;color:#00ffff;border:1px solid #00ffff44;border-radius:4px;padding:2px 4px;font-size:11px;">
        <option value="default">Default</option>
        <option value="neon">Neon</option>
        <option value="fire">Fire</option>
        <option value="ice">Ice</option>
        <option value="gold">Gold</option>
        <option value="shadow">Shadow</option>
        <option value="rainbow">Rainbow</option>
        <option value="plasma">Plasma</option>
    </select>
    <span style="letter-spacing:1px;margin-left:6px;">THÈME</span>
    <select id="e8themeSel" style="background:#000;color:#00ffff;border:1px solid #00ffff44;border-radius:4px;padding:2px 4px;font-size:11px;">
        <option value="cyber">Cyber</option>
        <option value="void">Void</option>
        <option value="forest">Forest</option>
        <option value="blood">Blood</option>
    </select>
    <span style="letter-spacing:1px;margin-left:6px;">PORTAILS</span>
    <button id="e8portalBtn" style="background:#000;color:#cc00ff;border:1px solid #cc00ff44;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:11px;pointer-events:all;">ON</button>
    <span style="letter-spacing:1px;margin-left:6px;">BOSS</span>
    <button id="e8bossBtn" style="background:#000;color:#ff4444;border:1px solid #ff444444;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:11px;pointer-events:all;">SPAWN</button>
`;
document.body.appendChild(e8panel);

document.getElementById("e8skinSel").onchange  = e => { e8skin  = e.target.value; };
document.getElementById("e8themeSel").onchange = e => { e8theme = e.target.value; };
document.getElementById("e8portalBtn").onclick = () => {
    if (e8portalA) { e8portalA=null; e8portalB=null; document.getElementById("e8portalBtn").textContent="OFF"; }
    else { e8spawnPortals(); document.getElementById("e8portalBtn").textContent="ON"; }
};
document.getElementById("e8bossBtn").onclick = () => { if(!e8bossActive) e8spawnBoss(); };

/* -------- PATCH UPDATE -------- */
const _e8_origUpdate = update;
update = function() {
    _e8_origUpdate();
    if (!snake[0] || dead) return;

    const head = snake[0];

    // Portails
    e8checkPortal(head);

    // Boss hit
    e8checkBossHit(head);

    // XP par nourriture
    const prevScore = scoreHistory.length > 1 ? scoreHistory[scoreHistory.length-2] : 0;
    if (score > prevScore) {
        e8gainXp(2);
        e8coins++;
        
        e8spawnBurst(head.x+box/2, head.y+box/2,
            E8_SKINS[e8skin](0, hue), 8);
    }

    

    // Boss update
    e8updateBoss();
    e8updateBossAttacks();

    // Particules
    e8updateParticles();

    // Survie mode timer
    if (e8survivalMode) {
        e8survivalTick++;
        if (e8survivalTick % 60 === 0) {
            e8survivalTime--;
            if (e8survivalTime <= 0) {
                e8survivalMode = false;
                e8gainXp(15);
                e8showNotif("✅ VAGUE SURVIVÉE ! +15 XP", "#00ff88");
            }
        }
    }

    // Spawn boss tous les 15 points si pas actif
    if (score > 0 && score % 15 === 0 && !e8bossActive && score !== e8_lastBossScore) {
        e8_lastBossScore = score;
        setTimeout(e8spawnBoss, 500);
    }

    // Spawn portails tous les 5 points si pas actifs
    if (score > 0 && score % 5 === 0 && !e8portalA && score !== e8_lastPortalScore) {
        e8_lastPortalScore = score;
        e8spawnPortals();
        document.getElementById("e8portalBtn").textContent = "ON";
    }
};

let e8_lastBossScore  = -1;
let e8_lastPortalScore = -1;

/* -------- PATCH DRAW -------- */
const _e8_origDraw = draw;
draw = function() {
    // Thème background
    ctx.fillStyle = E8_THEMES[e8theme].bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grille
    e8drawGrid();

    // Trail avant le serpent
    e8drawTrail();

    // Dessin original (serpent, food, obstacles, power-ups)
    // On skip le fillRect background du draw original en le redéfinissant temporairement
    _e8_origDraw();

    // Portails
    e8drawPortals();

    // Boss
    e8drawBoss();
    e8drawBossAttacks();

    // Particules
    e8drawParticles();

    // Screen shake
    e8applyShake();

    // Survie countdown
    if (e8survivalMode) {
        ctx.fillStyle    = `rgba(255,136,0,${0.6+0.4*Math.sin(e8survivalTick*0.2)})`;
        ctx.font         = "bold 18px Arial";
        ctx.textAlign    = "center";
        ctx.textBaseline = "top";
        ctx.fillText(`⚡ VAGUE ${e8waveNum}  —  ${e8survivalTime}s`, canvas.width/2, 20);
        ctx.textBaseline = "alphabetic";
    }

    
};

/* -------- PATCH DEATH : explosion -------- */
const _e8_origShowDeath = showDeath;
const _e9_origShowDeath2 = showDeath;
showDeath = function() {
    if (e9perks.reroll > 0 && !e9rerollUsed) {
        e9rerollUsed = true;
e8playerHp = 1 + (e9perks?.revive_hp || 0);
        e9updateHpDisplay();
        showPowerUpMessage("🔄 SECONDE CHANCE !");
        e8screenShake = 20;
        // Téléporte loin des obstacles
        snake[0] = {
            x: Math.floor(Math.random() * (canvas.width  / box)) * box,
            y: Math.floor(Math.random() * (canvas.height / box)) * box,
        };
        return;
    }
    _e9_origShowDeath2();
};

/* -------- PATCH RESET -------- */
const _e8_origReset = reset;
reset = function() {
    _e8_origReset();
    e9rerollUsed = false;
    e8level        = 1;
    e8xp           = 0;
    e8xpNext       = 10;
   
    e8trail        = [];
    e8particles    = [];
    e8portalA      = null;
    e8portalB      = null;
    e8bossActive   = false;
    e8boss         = null;
    e8survivalMode = false;
    e8survivalTick = 0;
    e8screenShake  = 0;
    e8_lastBossScore   = -1;
    e8_lastPortalScore = -1;
    canvas.style.transform = "none";
    document.getElementById("e8portalBtn").textContent = "OFF";
};

/* -------- MISE À JOUR HUD EXT8 -------- */
setInterval(() => {
    const xpPct = Math.round((e8xp / e8xpNext) * 100);
    e8hud.innerHTML = `
        <div style="font-size:10px;letter-spacing:2px;color:#ffffff44;margin-bottom:6px;">PROGRESSION</div>
        <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
            <span style="color:#ffff00;font-weight:bold;">LVL ${e8level}</span>
            <span style="color:#ffffff55;font-size:11px;">${e8xp}/${e8xpNext} XP</span>
        </div>
        <div style="background:#ffffff0e;border-radius:3px;height:4px;margin-bottom:8px;">
            <div style="height:100%;width:${xpPct}%;background:linear-gradient(90deg,#ffff00,#ff8800);border-radius:3px;transition:width 0.2s;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span style="color:#ffcc00;font-size:11px;">🪙 ${e8coins}</span>
            <span style="color:#ff8800;font-size:11px;">${e8skin.toUpperCase()}</span>
        </div>
        ${e8bossActive ? `<div style="color:#ff4444;font-size:11px;text-align:center;margin-top:4px;">👾 BOSS HP: ${e8bossHp}/${e8bossMaxHp}</div>
        
        <div style="text-align:center;color:#ff4444;font-weight:bold;">
    ❤️ ${e8playerHp}
</div>` : ""}
    `;
}, 100);

/* -------- SKIN OVERRIDE DANS DRAW SERPENT -------- */
// On surcharge la couleur du serpent selon le skin sélectionné
const _e8_ctxFillStyle_orig = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'fillStyle');
// Approche propre : on réécrit juste le dessin du serpent dans draw()
// Le serpent utilise hsl(hue+i*10,100%,60%) — on le remplace via le skin
// Le draw() original dessine déjà le serpent, le skin est appliqué via e8drawTrail()
// Pour changer la couleur du corps, on patch ctx.fillRect dans le scope snake.forEach :



/* ==========================================================
   FIN EXTENSION 8
   ========================================================== */

   /* ==========================================================
   EXTENSION 9 : ARBRE DE COMPÉTENCES + CŒURS FIXES
   ========================================================== */

   let e9rerollUsed = false;

   /* -------- PATCH DRAW : cœur pour heart_drop -------- */
const _e9_origDraw = draw;
draw = function() {
    _e9_origDraw();

    // Radar nourriture
if (e9perks.food_radar > 0 && snake[0] && food.length > 0) {
    let nearest = food[0];
    let minDist = Infinity;
    food.forEach(f => {
        const d = Math.abs(f.x-snake[0].x)+Math.abs(f.y-snake[0].y);
        if (d < minDist) { minDist=d; nearest=f; }
    });
    const angle = Math.atan2(nearest.y-snake[0].y, nearest.x-snake[0].x);
    const ax = snake[0].x+box/2+Math.cos(angle)*box*1.5;
    const ay = snake[0].y+box/2+Math.sin(angle)*box*1.5;
    ctx.strokeStyle="#00ffff"; ctx.lineWidth=2;
    ctx.shadowColor="#00ffff"; ctx.shadowBlur=8;
    ctx.beginPath();
    ctx.moveTo(snake[0].x+box/2, snake[0].y+box/2);
    ctx.lineTo(ax, ay);
    ctx.stroke(); ctx.shadowBlur=0;
}
// Radar power-up
if (e9perks.powerup_radar > 0 && snake[0] && powerUps.length > 0) {
    let nearest = powerUps[0];
    let minDist = Infinity;
    powerUps.forEach(p => {
        const d = Math.abs(p.x-snake[0].x)+Math.abs(p.y-snake[0].y);
        if (d < minDist) { minDist=d; nearest=p; }
    });
    const angle = Math.atan2(nearest.y-snake[0].y, nearest.x-snake[0].x);
    const ax = snake[0].x+box/2+Math.cos(angle)*box*2;
    const ay = snake[0].y+box/2+Math.sin(angle)*box*2;
    ctx.strokeStyle="#ff88ff"; ctx.lineWidth=2;
    ctx.shadowColor="#ff88ff"; ctx.shadowBlur=8;
    ctx.beginPath();
    ctx.moveTo(snake[0].x+box/2, snake[0].y+box/2);
    ctx.lineTo(ax, ay);
    ctx.stroke(); ctx.shadowBlur=0;
}

    // Redessine par-dessus les heart_drop avec un vrai cœur canvas
    powerUps.forEach(p => {
        if (p.type.id !== "heart_drop") return;
        const cx = p.x + box / 2;
        const cy = p.y + box / 2;
        p.tick = (p.tick || 0) + 1;
        const pulse = 1 + 0.15 * Math.sin(p.tick * 0.18);
        const s = box * 0.72 * pulse;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(s / 10, s / 10);

        // Glow
        ctx.shadowColor = "#ff2244";
        ctx.shadowBlur  = 18;

        // Dégradé cœur
        const grad = ctx.createRadialGradient(-2, -3, 0, 0, 0, 10);
        grad.addColorStop(0,   "#ff88aa");
        grad.addColorStop(0.5, "#ff2244");
        grad.addColorStop(1,   "#990022");

        // Path cœur (centré sur 0,0, taille ~10px)
        ctx.beginPath();
        ctx.moveTo(0, 3.5);
        ctx.bezierCurveTo(-1, 2, -5, 1, -5, -2);
        ctx.bezierCurveTo(-5, -5.5, -1, -6.5, 0, -4);
        ctx.bezierCurveTo(1, -6.5, 5, -5.5, 5, -2);
        ctx.bezierCurveTo(5, 1, 1, 2, 0, 3.5);
        ctx.closePath();

        ctx.fillStyle = grad;
        ctx.fill();

        // Reflet
        ctx.shadowBlur = 0;
        ctx.fillStyle  = "rgba(255,255,255,0.4)";
        ctx.beginPath();
        ctx.ellipse(-2, -2.5, 1.8, 1.1, -0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        ctx.shadowBlur = 0;
    });
};

/* -------- FIX CŒURS : reset à 3 au départ -------- */
const _e9_origReset = reset;
reset = function() {
    _e9_origReset();
    e8playerHp = 3 + (e9perks.extra_heart || 0);
    e9updateHpDisplay();
};

/* -------- PERKS PERMANENTS -------- */
var e9perks = {
    speed_up:      0,
    max_heart:     0,
    extra_heart:   0,
    score_boost:   0,
    xp_boost:      0,
    shield_charge: 0,
    lucky:         0,
    ghost_wall:    0,
    double_food:   0,
    coin_boost:    0,
    multi_shot:    0,
    boss_weakener: 0,
    time_slow:     0,
    reroll:        0,
};

const E9_TREE = [
    {
        id: "speed_up", label: "Vitesse +1", icon: "⚡",
        desc: "Déplacement 8% plus rapide",
        max: 5, costs: [8, 15, 25, 40, 60],
        color: "#ff8800",
        apply: (lvl) => { currentSpeed = Math.max(35, currentSpeed - 8); },
        reset: () => { currentSpeed = 85 - (e9perks.speed_up * 8); }
    },
    {
        id: "extra_heart", label: "Cœur +1", icon: "❤️",
        desc: "Un cœur supplémentaire au départ",
        max: 3, costs: [12, 25, 45],
        color: "#ff4466",
        apply: (lvl) => { e8playerHp++; e9updateHpDisplay(); },
        reset: () => {}
    },
    {
        id: "max_heart", label: "Vie max +1", icon: "💗",
        desc: "Augmente le max de cœurs",
        max: 3, costs: [20, 40, 70],
        color: "#ff88aa",
        apply: (lvl) => {},
        reset: () => {}
    },
    {
        id: "score_boost", label: "Score +10%", icon: "✨",
        desc: "Chaque point vaut plus",
        max: 3, costs: [10, 22, 40],
        color: "#ffff00",
        apply: (lvl) => {},
        reset: () => {}
    },
    {
        id: "xp_boost", label: "XP +20%", icon: "📈",
        desc: "Montée en niveau plus rapide",
        max: 3, costs: [10, 20, 35],
        color: "#00ffcc",
        apply: (lvl) => {},
        reset: () => {}
    },
    {
        id: "shield_charge", label: "Bouclier auto", icon: "🛡",
        desc: "Bouclier se recharge toutes les 30s",
        max: 2, costs: [25, 50],
        color: "#0088ff",
        apply: (lvl) => {},
        reset: () => {}
    },
    {
        id: "lucky", label: "Chance +1", icon: "🍀",
        desc: "Power-ups apparaissent plus vite",
        max: 3, costs: [12, 24, 42],
        color: "#00ff88",
        apply: (lvl) => {},
        reset: () => {}
    },
    {
        id: "ghost_wall", label: "Fantôme murs", icon: "👻",
        desc: "Traverse les murs pour toujours",
        max: 1, costs: [60],
        color: "#aaaaff",
        apply: (lvl) => { ghostActive = true; },
        reset: () => { if (e9perks.ghost_wall > 0) ghostActive = true; }
    },
    {
        id: "double_food", label: "Double food", icon: "🍎",
        desc: "+2 nourritures en permanence",
        max: 1, costs: [35],
        color: "#ff4444",
        apply: (lvl) => { food.push(spawnFood(), spawnFood()); },
        reset: () => {}
    },
    {
        id: "coin_boost", label: "Pièces +50%", icon: "🪙",
        desc: "Gagne plus de pièces par partie",
        max: 3, costs: [15, 30, 55],
        color: "#ffcc00",
        apply: (lvl) => {},
        reset: () => {}
    },
    {
        id: "multi_shot", label: "Triple food", icon: "🎯",
        desc: "+1 nourriture spawne en permanence",
        max: 3, costs: [18, 36, 65],
        color: "#ff6600",
        apply: (lvl) => { food.push(spawnFood()); },
        reset: () => { for(let i=0;i<e9perks.multi_shot;i++) food.push(spawnFood()); }
    },
    {
        id: "boss_weakener", label: "Anti-boss", icon: "💀",
        desc: "Boss a -2 HP max par niveau",
        max: 3, costs: [20, 40, 70],
        color: "#ff00ff",
        apply: (lvl) => {},
        reset: () => {}
    },
    {
        id: "time_slow", label: "Bullet time", icon: "⏱",
        desc: "Vitesse réduite à la mort imminente",
        max: 2, costs: [30, 55],
        color: "#88ffff",
        apply: (lvl) => {},
        reset: () => {}
    },
    {
        id: "reroll", label: "Seconde chance", icon: "🔄",
        desc: "Reviens à la vie 1x par partie",
        max: 2, costs: [40, 80],
        color: "#ffffff",
        apply: (lvl) => {},
        reset: () => {}
    },
    {
        id: "starter_score", label: "Score de départ", icon: "🚀",
        desc: "Commence chaque partie avec 5 points",
        max: 3, costs: [20, 40, 65],
        color: "#ff6600",
        apply: (lvl) => {},
        reset: () => { score += e9perks.starter_score * 5; scoreDisplay.textContent = "Score : " + score; }
    },
    {
        id: "snake_length", label: "Taille bonus", icon: "🐍",
        desc: "Serpent commence plus long",
        max: 3, costs: [15, 30, 50],
        color: "#00ff44",
        apply: (lvl) => { for(let i=0;i<3;i++) snake.push({...snake[snake.length-1]}); },
        reset: () => { for(let i=0;i<e9perks.snake_length*3;i++) snake.push({...snake[snake.length-1]}); }
    },
    {
        id: "food_value", label: "Nourriture +1", icon: "💎",
        desc: "Chaque pomme donne +1 point bonus",
        max: 4, costs: [12, 25, 45, 70],
        color: "#00ccff",
        apply: (lvl) => {},
        reset: () => {}
    },
    {
        id: "revive_hp", label: "Résurrection +1", icon: "✝️",
        desc: "Reviens avec 1 HP de plus après mort",
        max: 2, costs: [35, 65],
        color: "#ffaaff",
        apply: (lvl) => {},
        reset: () => {}
    },
    {
        id: "obstacle_immunity", label: "Anti-pics", icon: "🧱",
        desc: "Ignore les obstacles triangulaires",
        max: 1, costs: [45],
        color: "#aaffaa",
        apply: (lvl) => {},
        reset: () => {}
    },
    {
        id: "xp_on_kill", label: "XP boss x2", icon: "⚔️",
        desc: "Double l XP gagné en tuant un boss",
        max: 2, costs: [25, 50],
        color: "#ff44ff",
        apply: (lvl) => {},
        reset: () => {}
    },
    {
        id: "powerup_duration", label: "Durée power-up", icon: "⏳",
        desc: "Power-ups durent 30% plus longtemps",
        max: 3, costs: [18, 35, 60],
        color: "#ffdd00",
        apply: (lvl) => {},
        reset: () => {}
    },{
        id: "auto_shield", label: "Bouclier passif", icon: "🔰",
        desc: "Bouclier actif dès le début",
        max: 1, costs: [55],
        color: "#4488ff",
        apply: () => { shieldActive = true; activePowerUps["shield"] = { label:"SHIELD", color:"#0088ff", remaining:99, total:99 }; },
        reset: () => { if(e9perks.auto_shield>0){ shieldActive=true; activePowerUps["shield"]={label:"SHIELD",color:"#0088ff",remaining:99,total:99}; } }
    },
    {
        id: "score_on_kill", label: "Score boss +10", icon: "💥",
        desc: "+10 points quand tu tues un boss",
        max: 3, costs: [20, 40, 65],
        color: "#ff6644",
        apply: () => {},
        reset: () => {}
    },
    {
        id: "hp_on_eat", label: "Soin sur manger", icon: "🍏",
        desc: "10% de chance de regagner 1 HP en mangeant",
        max: 3, costs: [25, 50, 80],
        color: "#44ff88",
        apply: () => {},
        reset: () => {}
    },
    {
        id: "fast_start", label: "Démarrage rapide", icon: "🏁",
        desc: "Vitesse maximale dès le début pendant 5s",
        max: 1, costs: [30],
        color: "#ff4400",
        apply: () => {},
        reset: () => {}
    },
    {
        id: "coin_on_kill", label: "Pièces boss", icon: "💰",
        desc: "+20 pièces bonus en tuant un boss",
        max: 3, costs: [15, 30, 50],
        color: "#ffdd00",
        apply: () => {},
        reset: () => {}
    },
    {
        id: "xp_on_eat", label: "XP sur manger", icon: "⭐",
        desc: "+1 XP par pomme mangée",
        max: 3, costs: [10, 20, 35],
        color: "#ffff88",
        apply: () => {},
        reset: () => {}
    },
    {
        id: "bounce_immunity", label: "Anti-bounce", icon: "🪃",
        desc: "Immunité aux dégâts du bounce boss",
        max: 1, costs: [99999],
        color: "#88ffcc",
        apply: () => {},
        reset: () => {}
    },
    {
        id: "dash_immunity", label: "Anti-dash", icon: "💨",
        desc: "Immunité aux dégâts du dash boss",
        max: 1, costs: [99999],
        color: "#88ccff",
        apply: () => {},
        reset: () => {}
    },
    {
        id: "laser_immunity", label: "Anti-laser", icon: "🚫",
        desc: "Immunité au laser du boss",
        max: 1, costs: [99999],
        color: "#ff8888",
        apply: () => {},
        reset: () => {}
    },
    {
        id: "start_invincible", label: "Invincible départ", icon: "⚜️",
        desc: "3s d'invincibilité au début de chaque partie",
        max: 1, costs: [35],
        color: "#ffff00",
        apply: () => {},
        reset: () => {}
    },
    {
        id: "food_radar", label: "Radar nourriture", icon: "📡",
        desc: "Flèche qui pointe vers la nourriture la plus proche",
        max: 1, costs: [20],
        color: "#00ffff",
        apply: () => {},
        reset: () => {}
    },
    {
        id: "score_streak", label: "Combo streak", icon: "🔥",
        desc: "Manger 3 pommes d'affilée donne +1 bonus",
        max: 3, costs: [18, 36, 60],
        color: "#ff6600",
        apply: () => {},
        reset: () => {}
    },
    {
        id: "portal_boost", label: "Boost portail", icon: "🌀",
        desc: "+1 score en traversant un portail",
        max: 2, costs: [15, 30],
        color: "#cc44ff",
        apply: () => {},
        reset: () => {}
    },
    {
        id: "mini_boss_loot", label: "Loot amélioré", icon: "🎁",
        desc: "Boss drop toujours un cœur",
        max: 1, costs: [45],
        color: "#ff44aa",
        apply: () => {},
        reset: () => {}
    },
    {
        id: "coin_on_score", label: "Pièces par score", icon: "🪙",
        desc: "+1 pièce tous les 5 points",
        max: 3, costs: [12, 25, 45],
        color: "#ffaa00",
        apply: () => {},
        reset: () => {}
    },
    {
        id: "slow_obstacles", label: "Obstacles lents", icon: "🐌",
        desc: "Obstacles apparaissent 2x moins vite",
        max: 1, costs: [30],
        color: "#aaffaa",
        apply: () => {},
        reset: () => {}
    },
    {
        id: "head_armor", label: "Armure tête", icon: "🪖",
        desc: "Ignore 1 collision avec soi-même par partie",
        max: 2, costs: [35, 65],
        color: "#ccaa88",
        apply: () => {},
        reset: () => {}
    },
    {
        id: "xp_on_portal", label: "XP portail", icon: "🌐",
        desc: "+3 XP par portail traversé",
        max: 2, costs: [15, 30],
        color: "#aa88ff",
        apply: () => {},
        reset: () => {}
    },
    {
        id: "score_on_portal", label: "Score portail", icon: "✴️",
        desc: "+1 score par portail traversé",
        max: 2, costs: [20, 40],
        color: "#ff88ff",
        apply: () => {},
        reset: () => {}
    },
    {
        id: "boss_slow", label: "Boss ralenti", icon: "🧊",
        desc: "Boss se déplace 30% moins vite",
        max: 2, costs: [25, 50],
        color: "#88eeff",
        apply: () => {},
        reset: () => {}
    },
    {
        id: "food_magnet_start", label: "Aimant départ", icon: "🧲",
        desc: "Aimant actif les 10 premières secondes",
        max: 1, costs: [20],
        color: "#00ccff",
        apply: () => {},
        reset: () => {}
    },
    {
        id: "prestige_coins", label: "Pièces prestige", icon: "🏅",
        desc: "+100 pièces bonus au prochain prestige",
        max: 3, costs: [30, 60, 100],
        color: "#ffcc44",
        apply: () => {},
        reset: () => {}
    },
    {
        id: "auto_bomb", label: "Bombe auto", icon: "💣",
        desc: "Détruit tous les obstacles tous les 20 pts",
        max: 1, costs: [40],
        color: "#ff4422",
        apply: () => {},
        reset: () => {}
    },
    {
        id: "regen_timer", label: "Regen temporelle", icon: "⏰",
        desc: "Regagne 1 HP toutes les 45 secondes",
        max: 2, costs: [40, 75],
        color: "#ff88cc",
        apply: () => {},
        reset: () => {}
    },
    {
        id: "bigger_food", label: "Nourriture géante", icon: "🍕",
        desc: "Nourriture plus grande et plus facile à manger",
        max: 1, costs: [25],
        color: "#ffaa44",
        apply: () => {},
        reset: () => {}
    },
    {
        id: "wall_bounce", label: "Rebond mur", icon: "🏓",
        desc: "Rebondit sur les murs au lieu de mourir",
        max: 1, costs: [70],
        color: "#aaaaff",
        apply: () => { ghostActive = true; },
        reset: () => { if(e9perks.wall_bounce>0) ghostActive=true; }
    },
    {
        id: "score_insurance", label: "Assurance score", icon: "📋",
        desc: "Conserve 20% du score après mort",
        max: 2, costs: [35, 65],
        color: "#88ffff",
        apply: () => {},
        reset: () => {}
    },
    {
        id: "powerup_radar", label: "Radar power-up", icon: "🔍",
        desc: "Flèche qui pointe vers le power-up le plus proche",
        max: 1, costs: [25],
        color: "#ff88ff",
        apply: () => {},
        reset: () => {}
    },
];

/* -------- COINS PERSISTANTS -------- */
let e9totalCoins = Number(localStorage.getItem("snakeCoins")) || 0;
setInterval(() => {
    const mult = 1 + (e9perks.coin_boost || 0) * 0.5;
    e9totalCoins += Math.floor(e8coins * mult);
    e8coins = 0;
    localStorage.setItem("snakeCoins", e9totalCoins);
}, 2000);

/* -------- AFFICHAGE CŒURS -------- */
const e9hpBar = document.createElement("div");
e9hpBar.style.cssText = `
    position:absolute;top:10px;left:50%;transform:translateX(-50%);
    display:flex;gap:6px;align-items:center;z-index:30;pointer-events:none;
    font-size:22px;filter:drop-shadow(0 0 6px #ff4466);
`;
document.body.appendChild(e9hpBar);

function e9updateHpDisplay() {
    const maxHp = 3 + (e9perks.extra_heart || 0) + (e9perks.max_heart || 0);
    const hp    = Math.max(0, e8playerHp);
    e9hpBar.innerHTML = "";

    for (let i = 0; i < maxHp; i++) {
        const isFull = i < hp;
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "32");
        svg.setAttribute("height", "32");
        svg.setAttribute("viewBox", "0 0 32 32");
        svg.style.cssText = `
            transition: transform 0.15s, filter 0.15s;
            transform: ${isFull ? "scale(1.1)" : "scale(0.85)"};
            filter: ${isFull
                ? "drop-shadow(0 0 5px #ff2244) drop-shadow(0 0 10px #ff224488)"
                : "grayscale(1) opacity(0.25)"};
        `;

        // Dégradé interne
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        const gradId = `hg${i}`;
        defs.innerHTML = `
            <radialGradient id="${gradId}" cx="40%" cy="30%" r="65%">
                <stop offset="0%"   stop-color="${isFull ? "#ff88aa" : "#555"}"/>
                <stop offset="50%"  stop-color="${isFull ? "#ff2244" : "#333"}"/>
                <stop offset="100%" stop-color="${isFull ? "#990022" : "#1a1a1a"}"/>
            </radialGradient>
        `;
        svg.appendChild(defs);

        // Forme cœur via path
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M16 27 C16 27 4 19 4 11 C4 7 7 4 11 4 C13.5 4 15.5 5.5 16 7 C16.5 5.5 18.5 4 21 4 C25 4 28 7 28 11 C28 19 16 27 16 27Z");
        path.setAttribute("fill", `url(#${gradId})`);
        path.setAttribute("stroke", isFull ? "#ff0033" : "#444");
        path.setAttribute("stroke-width", "1");

        // Reflet
        const shine = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        shine.setAttribute("cx", "12");
        shine.setAttribute("cy", "10");
        shine.setAttribute("rx", "3.5");
        shine.setAttribute("ry", "2");
        shine.setAttribute("fill", isFull ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.05)");
        shine.setAttribute("transform", "rotate(-20 12 10)");

        svg.appendChild(path);
        svg.appendChild(shine);
        svg.dataset.index = i;
        e9hpBar.appendChild(svg);
    }
}
e9updateHpDisplay();

/* Patch e8damagePlayer pour mettre à jour l'affichage */
const _e9_origDamage = e8damagePlayer;
e8damagePlayer = function(amount = 1) {
    _e9_origDamage(amount);
    e9updateHpDisplay();
};

/* -------- EFFETS PASSIFS EN JEU -------- */

// Score boost
const _e9_origUpdate = update;
update = function() {
    _e9_origUpdate();
    // Aimant passif
if (snake.length > 0) {
    const activeRange = magnetActive ? 8 * box : 0;
    if (activeRange > 0) {
        for (let i = food.length - 1; i >= 0; i--) {
            const f  = food[i];
            const dx = snake[0].x - f.x;
            const dy = snake[0].y - f.y;
            const dist = Math.abs(dx) + Math.abs(dy);
            if (dist > 0 && dist <= activeRange) {
                if (Math.abs(dx) >= Math.abs(dy)) f.x += Math.sign(dx) * box;
                else                              f.y += Math.sign(dy) * box;
                f.x = Math.round(f.x / box) * box;
                f.y = Math.round(f.y / box) * box;
            }
        }
    }
}
};

// Score boost passif
const _e9_origScoreDisplay = setInterval;
const e9scoreBoostMultiplier = () => 1 + (e9perks.score_boost || 0) * 0.10;
const e9xpBoostMultiplier    = () => 1 + (e9perks.xp_boost    || 0) * 0.20;

// Patch gainXp pour le boost
const _e9_origGainXp = e8gainXp;
e8gainXp = function(amount) {
    _e9_origGainXp(Math.round(amount * e9xpBoostMultiplier()));
};

// Bouclier auto
let e9shieldTimer = null;
function e9startShieldRecharge() {
    if (e9shieldTimer) return;
    if (e9perks.shield_charge <= 0) return;
    const delay = e9perks.shield_charge >= 2 ? 20000 : 30000;
    e9shieldTimer = setTimeout(() => {
        if (!shieldActive && !dead) {
            shieldActive = true;
            activePowerUps["shield"] = { label:"SHIELD", color:"#0088ff", remaining:99, total:99 };
            showPowerUpMessage("🛡 BOUCLIER RECHARGÉ !");
        }
        e9shieldTimer = null;
        e9startShieldRecharge();
    }, delay);
}

// Power-ups plus fréquents
const e9puInterval = () => Math.max(1500, 4000 - (e9perks.lucky || 0) * 800);
let e9puTimer = null;
function e9restartPuTimer() {
    if (e9puTimer) clearInterval(e9puTimer);
    e9puTimer = setInterval(() => { if (!paused && !dead) spawnPowerUp(); }, e9puInterval());
}
e9restartPuTimer();

/* -------- MENU ARBRE (bouton K) -------- */
const e9overlay = document.createElement("div");
e9overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.92);
    display:none;z-index:200;overflow-y:auto;
    font-family:Arial;color:white;
`;
document.body.appendChild(e9overlay);

function e9renderTree() {
    e9overlay.innerHTML = `
        <div style="max-width:760px;margin:0 auto;padding:24px 16px 48px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                <div>
                    <div style="font-size:26px;font-weight:bold;color:#00ffcc;letter-spacing:2px;">🌳 ARBRE DE COMPÉTENCES</div>
                    <div style="font-size:13px;color:#ffffff66;margin-top:4px;">Les améliorations sont permanentes entre les parties</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:22px;color:#ffcc00;font-weight:bold;">🪙 ${e9totalCoins}</div>
                    <div style="font-size:11px;color:#ffffff44;">pièces disponibles</div>
                    <button onclick="e9closeTree()" style="
                        margin-top:8px;padding:8px 18px;background:#000;
                        color:#ff4444;border:1px solid #ff4444;border-radius:8px;
                        cursor:pointer;font-size:13px;font-weight:bold;
                    ">✕ Fermer [K]</button>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;">
                ${E9_TREE.map(perk => e9renderPerk(perk)).join("")}
            </div>
        </div>
        <button onclick="e9resetPerks()" style="
    margin-top:8px;padding:8px 18px;background:#000;
    color:#ff8800;border:1px solid #ff8800;border-radius:8px;
    cursor:pointer;font-size:13px;font-weight:bold;
">🔁 Reset tout [remboursé à 50%]</button>
    `;

    
}

function e9resetPerks() {
    if (!confirm("Reset tous les perks ? Tu récupères 50% des pièces dépensées.")) return;
    let refund = 0;
    for (const id in e9perks) {
        const perk = E9_TREE.find(p => p.id === id);
        if (!perk) continue;
        for (let i = 0; i < e9perks[id]; i++) refund += perk.costs[i];
        e9perks[id] = 0;
    }
    e9totalCoins += Math.floor(refund * 0.5);
    localStorage.setItem("snakeCoins", e9totalCoins);
    localStorage.setItem("snakePerks", JSON.stringify(e9perks));
    // Réappliquer les défauts
    currentSpeed  = 85;
    ghostActive   = false;
    e8playerHp    = 3;
    e9updateHpDisplay();
    e9renderTree();
    showPowerUpMessage(`🔁 Reset ! +${Math.floor(refund * 0.5)} pièces remboursées`);
}

function e9renderPerk(perk) {
    const lvl     = e9perks[perk.id] || 0;
    const maxed   = lvl >= perk.max;
    const cost    = maxed ? null : perk.costs[lvl];
    const canAfford = !maxed && e9totalCoins >= cost;
    const pct     = (lvl / perk.max) * 100;

    return `
        <div style="
            background:rgba(255,255,255,0.04);
            border:1px solid ${maxed ? perk.color : "rgba(255,255,255,0.12)"};
            border-radius:12px;padding:14px;
            box-shadow:${maxed ? `0 0 14px ${perk.color}44` : "none"};
            transition:border 0.2s;
        ">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                <span style="font-size:22px;">${perk.icon}</span>
                <div>
                    <div style="font-size:14px;font-weight:bold;color:${perk.color};">${perk.label}</div>
                    <div style="font-size:11px;color:#ffffff55;">${perk.desc}</div>
                </div>
            </div>

            <!-- Niveau -->
            <div style="display:flex;justify-content:space-between;font-size:11px;color:#ffffff44;margin-bottom:4px;">
                <span>Niveau ${lvl} / ${perk.max}</span>
                ${maxed ? `<span style="color:${perk.color};font-weight:bold;">MAX</span>` : `<span style="color:#ffcc00;">🪙 ${cost}</span>`}
            </div>

            <!-- Barre progression -->
            <div style="background:#ffffff0e;border-radius:4px;height:5px;margin-bottom:10px;overflow:hidden;">
                <div style="height:100%;width:${pct}%;background:${perk.color};border-radius:4px;transition:width 0.3s;"></div>
            </div>

            <!-- Points acquis -->
            <div style="display:flex;gap:5px;margin-bottom:10px;">
                ${Array.from({length:perk.max}, (_,i) => `
                    <div style="flex:1;height:4px;border-radius:2px;background:${i < lvl ? perk.color : "#ffffff0e"};"></div>
                `).join("")}
            </div>

            <!-- Bouton acheter -->
            <button
                onclick="e9buyPerk('${perk.id}')"
                ${(maxed || !canAfford) ? "disabled" : ""}
                style="
                    width:100%;padding:8px;border-radius:8px;font-size:12px;font-weight:bold;cursor:pointer;
                    background:${maxed ? "rgba(0,0,0,0.3)" : canAfford ? perk.color + "22" : "rgba(0,0,0,0.2)"};
                    color:${maxed ? "#ffffff33" : canAfford ? perk.color : "#ffffff22"};
                    border:1px solid ${maxed ? "#ffffff11" : canAfford ? perk.color : "#ffffff11"};
                    opacity:${maxed || !canAfford ? 0.5 : 1};
                    transition:all 0.15s;
                "
            >${maxed ? "Maxé ✓" : canAfford ? `Acheter — 🪙 ${cost}` : `Insuffisant — 🪙 ${cost}`}</button>
        </div>
    `;
}

function e9buyPerk(id) {
    const perk = E9_TREE.find(p => p.id === id);
    if (!perk) return;
    const lvl  = e9perks[id] || 0;
    if (lvl >= perk.max) return;
    const cost = perk.costs[lvl];
    if (e9totalCoins < cost) return;

    e9totalCoins -= cost;
    localStorage.setItem("snakeCoins", e9totalCoins);
    e9perks[id] = lvl + 1;
    localStorage.setItem("snakePerks", JSON.stringify(e9perks));

    perk.apply(e9perks[id]);

    // Effets spéciaux post-achat
    if (id === "ghost_wall")     ghostActive = true;
    if (id === "shield_charge")  e9startShieldRecharge();
    if (id === "lucky")          e9restartPuTimer();
    if (id === "double_food")    { food.push(spawnFood(), spawnFood()); }

    e9renderTree();
}

function e9openTree() {
    paused = true;
    e9totalCoins = Number(localStorage.getItem("snakeCoins")) || 0;
    e9renderTree();
    e9overlay.style.display = "block";
}

function e9closeTree() {
    e9overlay.style.display = "none";
    paused = false;
}

/* -------- CHARGEMENT PERKS SAUVEGARDÉS -------- */
function e9loadPerks() {
    const saved = localStorage.getItem("snakePerks");
    if (!saved) return;
    const data = JSON.parse(saved);
    for (const id in data) {
        e9perks[id] = data[id];
        const perk = E9_TREE.find(p => p.id === id);
        if (perk && e9perks[id] > 0) {
            perk.reset();
        }
    }
    // Appliquer vitesse sauvegardée
    currentSpeed = Math.max(35, 85 - (e9perks.speed_up || 0) * 8);
    e9updateHpDisplay();
    if (e9perks.ghost_wall > 0) ghostActive = true;
    if (e9perks.shield_charge > 0) e9startShieldRecharge();
}
e9loadPerks();

/* -------- TOUCHE K -------- */
document.addEventListener("keydown", e => {
    if (e.key.toLowerCase() === "k") {
        if (e9overlay.style.display === "block") e9closeTree();
        else e9openTree();
    }
});

/* -------- BOUTON UI -------- */
const e9treeBtn = document.createElement("button");
e9treeBtn.textContent = "🌳 Compétences [K]";
e9treeBtn.style.cssText = `
    position:absolute;bottom:65px;left:15px;
    padding:8px 16px;background:#000;
    color:#00ffcc;border:2px solid #00ffcc;border-radius:8px;
    cursor:pointer;font-size:13px;font-weight:bold;z-index:20;
    box-shadow:0 0 12px #00ffcc44;pointer-events:all;
`;
document.body.appendChild(e9treeBtn);
e9treeBtn.onclick = () => {
    if (e9overlay.style.display === "block") e9closeTree();
    else e9openTree();
};

/* -------- PATCH RESET POUR APPLIQUER LES PERKS -------- */

e9headArmorCharges = e9perks.head_armor || 0;
// fast_start
if (e9perks.fast_start > 0) {
    currentSpeed = 35;
    setTimeout(() => { if(!dead) currentSpeed = Math.max(35, 85-(e9perks.speed_up||0)*8); }, 5000);
}
// start_invincible
if (e9perks.start_invincible > 0) {
    invincibleActive = true;
    activePowerUps["invincible"] = { label:"INV", color:"#ffff00", remaining:3, total:3 };
    setTimeout(() => { invincibleActive = false; delete activePowerUps["invincible"]; }, 3000);
}
// food_magnet_start
if (e9perks.food_magnet_start > 0) {
    magnetActive = true;
    setTimeout(() => { magnetActive = false; }, 10000);
}
// regen_timer
if (e9perks.regen_timer > 0) {
    const regenDelay = e9perks.regen_timer >= 2 ? 30000 : 45000;
    const regenInterval = setInterval(() => {
        if (dead) { clearInterval(regenInterval); return; }
        const maxHpR = 3 + (e9perks.extra_heart||0) + (e9perks.max_heart||0);
        if (e8playerHp < maxHpR) { e8playerHp++; e9updateHpDisplay(); showPowerUpMessage("⏰ REGEN +1 HP"); }
    }, regenDelay);
}
// auto_bomb
if (e9perks.auto_bomb > 0) {
    const bombInterval = setInterval(() => {
        if (dead) { clearInterval(bombInterval); return; }
        if (score > 0 && score % 20 === 0) { obstacles.length = 0; showPowerUpMessage("💣 BOMBE AUTO !"); }
    }, 500);
}
const _e9_baseReset = reset;
reset = function() {
    _e9_baseReset();
    // Réappliquer perks permanents après reset
    currentSpeed = Math.max(35, 85 - (e9perks.speed_up || 0) * 8);
    if (e9perks.ghost_wall > 0) ghostActive = true;
    if (e9perks.double_food > 0) { food.push(spawnFood(), spawnFood()); }
    e8playerHp = 3 + (e9perks.extra_heart || 0);
    e9updateHpDisplay();
    if (e9perks.shield_charge > 0) {
        clearTimeout(e9shieldTimer);
        e9shieldTimer = null;
        e9startShieldRecharge();
    }
    if (e9perks.starter_score > 0) {
    score += e9perks.starter_score * 5;
    scoreDisplay.textContent = "Score : " + score;
}
};

/* -------- PATCH SCORE BOOST -------- */
// Intercept l'ajout de score pour appliquer le multiplicateur de perk
const _e9_origLoop = loop;
// On surcharge via le point d'ajout de score dans update() — on patch scoreMultiplier global
Object.defineProperty(window, 'scoreMultiplier', {
    get() { return this._scoreMultiplier ?? 1; },
    set(v) { this._scoreMultiplier = v; },
    configurable: true
});

// Patch propre : on multiplie lors du calcul du score dans update()
// Le score est calculé : const gained = 1 * scoreMultiplier
// On ajoute le boost perk au scoreMultiplier effectif
const _e9_getScore = () => scoreMultiplier * (1 + (e9perks.score_boost || 0) * 0.10);

// Affichage pièces dans HUD
setInterval(() => {
    const coinEl = document.querySelector("#e8coinDisplay");
    if (coinEl) coinEl.textContent = `🪙 ${e9totalCoins}`;
}, 500);

/* -------- AFFICHAGE PIÈCES TOTALES (HUD) -------- */
const e9coinHud = document.createElement("div");
e9coinHud.id = "e8coinDisplay";
e9coinHud.style.cssText = `
    position:absolute;top:45px;left:10px;
    color:#ffcc00;font-family:Arial;font-size:15px;
    font-weight:bold;z-index:20;
    text-shadow:0 0 8px #ffcc0088;
`;
e9coinHud.textContent = `🪙 ${e9totalCoins}`;
document.body.appendChild(e9coinHud);

/* ==========================================================
   FIN EXTENSION 9
   ========================================================== */

   /* ==========================================================
   EXTENSION 10 : SYSTÈME DE PRESTIGE
   ========================================================== */

/* -------- ÉTAT -------- */
let e10prestigeLevel = Number(localStorage.getItem("snakePrestige")) || 0;
let e10prestigeReady = false;

const E10_PRESTIGE_THRESHOLDS = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];

const E10_PRESTIGE_BADGES = ["☆","★","◆","♛","☯","⚡","🔥","💎","👑","🌟"];
const E10_PRESTIGE_COLORS = [
    "#aaaaaa","#ffcc00","#00ffcc","#ff00ff",
    "#ff8800","#00aaff","#ff4444","#88ffff","#ffdd00","#ffffff"
];
const E10_PRESTIGE_NAMES = [ 
    "Bronze","Argent","Or","Platine",
    "Diamant","Saphir","Rubis","Émeraude","Obsidienne","Divin"
];

/* -------- MULTIPLICATEURS -------- */
function e10coinMult()  { return 1 + e10prestigeLevel * 0.5;  } // +50% pièces par prestige
function e10xpMult()    { return 1 + e10prestigeLevel * 0.3;  } // +30% XP par prestige
function e10scoreMult() { return 1 + e10prestigeLevel * 0.15; } // +15% score par prestige

/* -------- BADGE PRESTIGE (HUD) -------- */
const e10badge = document.createElement("div");
e10badge.style.cssText = `
    position:absolute;top:10px;left:50%;
    transform:translateX(-50%) translateY(38px);
    font-family:Arial;font-size:12px;font-weight:bold;
    letter-spacing:2px;opacity:0;transition:opacity 0.4s;
    pointer-events:none;z-index:30;text-align:center;
    white-space:nowrap;
`;
document.body.appendChild(e10badge);

function e10updateBadge() {
    if (e10prestigeLevel === 0) {
        e10badge.style.opacity = "0";
        return;
    }
    const col  = E10_PRESTIGE_COLORS[Math.min(e10prestigeLevel - 1, 9)];
    const icon = E10_PRESTIGE_BADGES[Math.min(e10prestigeLevel - 1, 9)];
    const name = E10_PRESTIGE_NAMES[Math.min(e10prestigeLevel - 1, 9)];
    e10badge.innerHTML = `
        <span style="
            color:${col};
            text-shadow:0 0 8px ${col};
            font-size:13px;
        ">${icon} PRESTIGE ${e10prestigeLevel} — ${name} ${icon}</span>
    `;
    e10badge.style.opacity = "1";
}
e10updateBadge();

/* -------- BOUTON PRESTIGE (apparaît quand score >= seuil) -------- */
const e10btn = document.createElement("button");
e10btn.style.cssText = `
    position:absolute;top:50%;left:50%;
    transform:translate(-50%,-50%);
    padding:16px 36px;
    font-family:Arial;font-size:18px;font-weight:bold;
    border-radius:14px;cursor:pointer;
    display:none;z-index:150;
    transition:box-shadow 0.2s;
    pointer-events:all;
`;
document.body.appendChild(e10btn);

function e10updateBtn() {
    if (!e10prestigeReady || dead || paused) {
        e10btn.style.display = "none";
        return;
    }
    e10btn.style.display    = "block";
    e10btn.style.background = "#000";
    e10btn.style.color      = col;
    e10btn.style.border     = `2px solid ${col}`;
    e10btn.style.boxShadow  = `0 0 30px ${col}, 0 0 60px ${col}44`;
    const next  = E10_PRESTIGE_NAMES[Math.min(e10prestigeLevel, 9)];
const col   = E10_PRESTIGE_COLORS[Math.min(e10prestigeLevel, 9)];
const thresh = E10_PRESTIGE_THRESHOLDS[e10prestigeLevel] || 9999;
e10btn.innerHTML = `
    <div style="font-size:32px;">${E10_PRESTIGE_BADGES[Math.min(e10prestigeLevel,9)]}</div>
    <div>PRESTIGE → ${next}</div>
    <div style="font-size:12px;opacity:0.7;margin-top:6px;">
        Remet à zéro · +50% 🪙 · +30% XP · +15% score
    </div>

`;
}

e10btn.onclick = () => e10doPrestige();

/* -------- ANIMATION PRESTIGE -------- */
function e10doPrestige() {
    if (!e10prestigeReady) return;

    e10prestigeLevel++;
    localStorage.setItem("snakePrestige", e10prestigeLevel);
    e10prestigeReady = false;
    e10btn.style.display = "none";

    // Reset pièces, perks, niveau
    e9totalCoins = 0;
    localStorage.setItem("snakeCoins", 0);

    for (const id in e9perks) e9perks[id] = 0;
    localStorage.setItem("snakePerks", JSON.stringify(e9perks));

    e8level  = 1;
    e8xp     = 0;
    e8xpNext = 10;

    // Réappliquer les défauts des perks
    currentSpeed  = 85;
    ghostActive   = false;

    // Explosion visuelle
    for (let i = 0; i < 60; i++) {
        setTimeout(() => {
            e8spawnBurst(
                Math.random() * canvas.width,
                Math.random() * canvas.height,
                E10_PRESTIGE_COLORS[Math.min(e10prestigeLevel - 1, 9)],
                3
            );
        }, i * 20);
    }

    e8screenShake = 30;

    const flashEl = document.createElement("div");
    flashEl.style.cssText = `
        position:fixed;inset:0;
        background:${E10_PRESTIGE_COLORS[Math.min(e10prestigeLevel-1,9)]};
        opacity:0.7;z-index:500;pointer-events:none;
        transition:opacity 1s;
    `;
    document.body.appendChild(flashEl);
    setTimeout(() => { flashEl.style.opacity = "0"; }, 100);
    setTimeout(() => { flashEl.remove(); }, 1200);

    const col10  = E10_PRESTIGE_COLORS[Math.min(e10prestigeLevel-1,9)];
const icon10 = E10_PRESTIGE_BADGES[Math.min(e10prestigeLevel-1,9)];
const name10 = E10_PRESTIGE_NAMES[Math.min(e10prestigeLevel-1,9)];

const e10notif = document.createElement("div");
e10notif.style.cssText = `
    position:fixed;
    right:20px;
    top:50%;
    transform:translateY(-50%);
    background:rgba(0,0,0,0.9);
    border:2px solid ${col10};
    border-radius:14px;
    padding:20px 28px;
    font-family:Arial;
    font-weight:bold;
    text-align:center;
    color:${col10};
    font-size:22px;
    box-shadow:0 0 30px ${col10};
    z-index:600;
    opacity:1;
    transition:opacity 0.6s;
    pointer-events:none;
    line-height:1.6;
`;
e10notif.innerHTML = `
    <div style="font-size:40px;">${icon10}</div>
    <div>PRESTIGE ${e10prestigeLevel}</div>
    <div style="font-size:14px;color:#ffffff88;">${name10}</div>
    <div style="font-size:12px;color:#ffffff44;margin-top:6px;">
        ×${e10coinMult().toFixed(1)} 🪙 &nbsp; ×${e10xpMult().toFixed(1)} XP
    </div>
`;
document.body.appendChild(e10notif);
setTimeout(() => { e10notif.style.opacity = "0"; }, 2500);
setTimeout(() => { e10notif.remove(); }, 3200);

    e10updateBadge();
    e10applyMults();

    setTimeout(() => { reset(); }, 800);
}

/* -------- APPLIQUER LES MULTIPLICATEURS -------- */
function e10applyMults() {
    // XP boost — patch e8gainXp via le multiplicateur prestige
    // Coin boost — appliqué dans le setInterval des coins
    // Score boost — appliqué dans update()
}

/* -------- PATCH COINS POUR PRESTIGE -------- */
// Surcharge le setInterval des coins de l'extension 9
// On wrap e8coins avant qu'il soit vidé
const _e10_origCoinInterval = setInterval;
let _e10_coinPatchDone = false;
(function patchCoinCollection() {
    if (_e10_coinPatchDone) return;
    _e10_coinPatchDone = true;
    const _origGainXp2 = e8gainXp;
    e8gainXp = function(amount) {
        _origGainXp2(Math.round(amount * e10xpMult()));
    };
})();

/* -------- PATCH UPDATE POUR SCORE PRESTIGE -------- */
const _e10_origUpdate = update;
update = function() {
    _e10_origUpdate();

    // Vérifie si le score atteint le seuil de prestige
    const threshold = E10_PRESTIGE_THRESHOLDS[e10prestigeLevel] || 9999;
    if (score >= threshold && !e10prestigeReady && !dead) {
        e10prestigeReady = true;
        e10updateBtn();
        e8showNotif("✨ PRESTIGE DISPONIBLE !", E10_PRESTIGE_COLORS[Math.min(e10prestigeLevel, 9)]);
        // Pulse le bouton
        let pulses = 0;
        const pulseInterval = setInterval(() => {
            if (pulses++ > 6 || !e10prestigeReady) { clearInterval(pulseInterval); return; }
            e8screenShake = 4;
        }, 400);
    }
};

/* -------- PATCH DRAW POUR EFFET PRESTIGE READY -------- */
const _e10_origDraw = draw;
draw = function() {
    _e10_origDraw();

    if (!e10prestigeReady || dead) return;

    // Bordure arc-en-ciel pulsante autour du canvas
    const col   = E10_PRESTIGE_COLORS[Math.min(e10prestigeLevel, 9)];
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.005);
    ctx.strokeStyle = col;
    ctx.lineWidth   = 6 * pulse + 2;
    ctx.shadowColor = col;
    ctx.shadowBlur  = 20 * pulse;
    ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
    ctx.shadowBlur  = 0;
};

/* -------- PATCH RESET -------- */
const _e10_origReset = reset;
reset = function() {
    _e10_origReset();
    e10prestigeReady = false;
    e10btn.style.display = "none";
    e10updateBadge();
};

/* -------- PATCH COINS (multiplicateur prestige) -------- */
// On wrap le sync des coins pour appliquer le mult prestige
const _e10_origE9CoinSync = setInterval(() => {}, 999999); // dummy
// Patch direct : on intercept e8coins dans le loop existant
// Le multiplicateur prestige est appliqué via e9totalCoins directement
const _e10_coinBoostInterval = setInterval(() => {
    if (e10prestigeLevel === 0) return;
    // Bonus passif de pièces selon le prestige (bonus par seconde)
    if (!paused && !dead && score > 0) {
        e9totalCoins += e10prestigeLevel;
        localStorage.setItem("snakeCoins", e9totalCoins);
    }
}, 3000);

/* -------- PATCH SCORE MULT -------- */
// Intercepte chaque gain de score pour appliquer le mult prestige
const _e10_origFoodEat = food;
// Le mult est appliqué via scoreMultiplier au moment du eat dans update()
// On override scoreMultiplier effectif
const _e10_origScoreMult = scoreMultiplier;
setInterval(() => {
    if (e10prestigeLevel > 0 && scoreMultiplier === 1) {
        // Boost passif du score multiplier selon prestige
        // On ne touche pas scoreMultiplier directement pour ne pas casser les power-ups
        // À la place on donne des pièces bonus proportionnelles au score
    }
}, 100);

/* -------- HUD PRESTIGE (stats en jeu) -------- */
const e10hud = document.createElement("div");
e10hud.style.cssText = `
    position:absolute;top:115px;left:10px;
    font-family:Arial;font-size:11px;
    color:#ffffff44;z-index:20;
    pointer-events:none;
    line-height:1.6;
`;
document.body.appendChild(e10hud);

setInterval(() => {
    if (e10prestigeLevel === 0) {
        const threshold = E10_PRESTIGE_SCORE;
        e10hud.innerHTML = `<span style="color:#ffffff22;">Prestige : score ${threshold} requis</span>`;
        return;
    }
    const col      = E10_PRESTIGE_COLORS[Math.min(e10prestigeLevel - 1, 9)];
    const nextThresh = E10_PRESTIGE_THRESHOLDS[e10prestigeLevel] || "MAX";
    e10hud.innerHTML = `
        <span style="color:${col};">
            ${E10_PRESTIGE_BADGES[Math.min(e10prestigeLevel-1,9)]}
            P${e10prestigeLevel}
            ×${e10coinMult().toFixed(1)} 🪙
            ×${e10xpMult().toFixed(1)} XP
        </span><br>
        <span style="color:#ffffff22;">Prochain : ${nextThresh} pts</span>
    `;
    e10updateBtn();
}, 200);

/* ==========================================================
   FIN EXTENSION 10
   ========================================================== */

   /* ==========================================================
   EXTENSION 11 : RELIQUES ROGUELIKE
   ========================================================== */

/* -------- ÉTAT -------- */
let e11relics        = [];   // reliques actives cette partie
let e11relicsPending = false;
let e11lastRelicScore = -1;
const E11_RELIC_INTERVAL = 50; // toutes les 50 points
let e11softLandingActive = false;
let e11cursedGoldCount   = 0;
let e11soulCount         = 0;
let e11bountyCount       = 0;
let e11cannibalActive    = false;
let e11divineUsed        = false;
let e11lastDoomScore     = -1;

/* -------- DÉFINITION DES RELIQUES -------- */
const E11_ALL_RELICS = [
    {
        id: "berserker", name: "Berserker", icon: "⚔️", rarity: "rare",
        color: "#ff2200",
        desc: "Score x3 mais tu n'as qu'1 seul cœur maximum",
        onApply: () => {
            scoreMultiplier = Math.max(scoreMultiplier, 3);
            const excess = e8playerHp - 1;
            if (excess > 0) { e8playerHp = 1; e9updateHpDisplay(); }
        },
        onEat: null, onKill: null, onTick: null
    },
    {
        id: "vampire", name: "Vampire", icon: "🧛", rarity: "rare",
        color: "#aa0044",
        desc: "Regagne 1 HP en tuant un boss, mais perd 1 HP toutes les 30s",
        onApply: () => {
            const t = setInterval(() => {
                if (dead || !e11relics.find(r=>r.id==="vampire")) { clearInterval(t); return; }
                e8playerHp = Math.max(1, e8playerHp-1);
                e9updateHpDisplay();
                showPowerUpMessage("🧛 DRAIN -1 HP");
            }, 30000);
        },
        onKill: () => {
            const maxHp = 3+(e9perks.extra_heart||0)+(e9perks.max_heart||0);
            if (e8playerHp < maxHp) { e8playerHp++; e9updateHpDisplay(); showPowerUpMessage("🧛 DRAIN +1 HP"); }
        },
        onEat: null, onTick: null
    },
    {
        id: "golden_apple", name: "Pomme d'or", icon: "🍎", rarity: "commun",
        color: "#ffcc00",
        desc: "Chaque pomme vaut +2 points",
        onApply: () => {},
        onEat: () => { score++; scoreDisplay.textContent="Score : "+score; },
        onKill: null, onTick: null
    },
    {
        id: "phoenix", name: "Phénix", icon: "🔥", rarity: "legendaire",
        color: "#ff8800",
        desc: "Reviens à la vie 1 fois avec 3 HP mais perd toutes les reliques",
        onApply: () => {},
        onEat: null, onKill: null, onTick: null,
        onDeath: () => {
            const idx = e11relics.findIndex(r=>r.id==="phoenix");
            if (idx === -1) return false;
            e11relics = []; // perd toutes les reliques
            e8playerHp = 3;
            e9updateHpDisplay();
            e8screenShake = 20;
            showPowerUpMessage("🔥 PHÉNIX — RENAISSANCE !");
            e11updateRelicHud();
            return true; // bloque la mort
        }
    },
    {
        id: "speed_demon", name: "Démon vitesse", icon: "💨", rarity: "rare",
        color: "#ff4400",
        desc: "Vitesse x2 mais contrôles inversés en permanence",
        onApply: () => { currentSpeed = Math.max(35, currentSpeed/2); reverseControls = true; },
        onEat: null, onKill: null, onTick: null
    },
    {
        id: "ghost_relic", name: "Esprit", icon: "👻", rarity: "commun",
        color: "#aaaaff",
        desc: "Traverse murs et obstacles pour toujours",
        onApply: () => { ghostActive = true; },
        onEat: null, onKill: null, onTick: null
    },
    {
        id: "coin_magnet", name: "Magnat", icon: "💎", rarity: "commun",
        color: "#ffdd44",
        desc: "+5 pièces par pomme mangée",
        onApply: () => {},
        onEat: () => { e8coins += 5; },
        onKill: null, onTick: null
    },
    {
        id: "shield_eternal", name: "Aegis", icon: "🛡", rarity: "rare",
        color: "#0088ff",
        desc: "Bouclier permanent qui se recharge toutes les 15s",
        onApply: () => {
            shieldActive = true;
            activePowerUps["shield"]={label:"SHIELD",color:"#0088ff",remaining:99,total:99};
            const t = setInterval(() => {
                if (dead || !e11relics.find(r=>r.id==="shield_eternal")) { clearInterval(t); return; }
                if (!shieldActive) {
                    shieldActive=true;
                    activePowerUps["shield"]={label:"SHIELD",color:"#0088ff",remaining:99,total:99};
                    showPowerUpMessage("🛡 AEGIS RECHARGÉ");
                }
            }, 15000);
        },
        onEat: null, onKill: null, onTick: null
    },
    {
        id: "glass_cannon", name: "Canon de verre", icon: "🔮", rarity: "legendaire",
        color: "#ff00ff",
        desc: "Score x5 mais tu meurs au moindre contact",
        onApply: () => {
            scoreMultiplier = Math.max(scoreMultiplier, 5);
            e8playerHp = 1;
            e9updateHpDisplay();
        },
        onEat: null, onKill: null, onTick: null
    },
    {
        id: "lucky_clover", name: "Trèfle chanceux", icon: "🍀", rarity: "commun",
        color: "#00ff88",
        desc: "Double les power-ups sur la map",
        onApply: () => {
            const extra = [...powerUps];
            extra.forEach(() => spawnPowerUp());
        },
        onEat: null, onKill: null, onTick: null
    },
    {
        id: "time_lord", name: "Seigneur du temps", icon: "⏳", rarity: "legendaire",
        color: "#88ffff",
        desc: "Bullet time permanent — vitesse divisée par 2",
        onApply: () => { currentSpeed = Math.min(250, currentSpeed * 2); },
        onEat: null, onKill: null, onTick: null
    },
    {
        id: "boss_hunter", name: "Chasseur", icon: "🎯", rarity: "rare",
        color: "#ff6644",
        desc: "+20 score et +50 pièces par boss tué",
        onApply: () => {},
        onEat: null,
        onKill: () => {
            score += 20; scoreDisplay.textContent="Score : "+score;
            e8coins += 50;
            showPowerUpMessage("🎯 CHASSEUR +20 pts +50 🪙");
        },
        onTick: null
    },
    {
        id: "reaper", name: "Faucheur", icon: "💀", rarity: "legendaire",
        color: "#8800ff",
        desc: "Chaque mort évitée (shield/invincible) donne +5 score",
        onApply: () => {},
        onEat: null, onKill: null, onTick: null
    },// ===== 20 NOUVELLES COMMUNES =====
{
    id: "double_spawn", name: "Double spawn", icon: "🍀", rarity: "commun",
    color: "#88ff88",
    desc: "+2 nourritures permanentes sur la map",
    onApply: () => { food.push(spawnFood(), spawnFood()); },
    onEat: null, onKill: null, onTick: null
},
{
    id: "xp_feast", name: "Festin XP", icon: "⭐", rarity: "commun",
    color: "#ffff88",
    desc: "+3 XP par pomme mangée",
    onApply: () => {},
    onEat: () => { e8gainXp(3); },
    onKill: null, onTick: null
},
{
    id: "coin_rain", name: "Pluie de pièces", icon: "🪙", rarity: "commun",
    color: "#ffcc44",
    desc: "+3 pièces par pomme mangée",
    onApply: () => {},
    onEat: () => { e8coins += 3; },
    onKill: null, onTick: null
},
{
    id: "soft_landing", name: "Atterrissage doux", icon: "🪶", rarity: "commun",
    color: "#ccffcc",
    desc: "Le premier obstacle touché est ignoré",
    onApply: () => { e11softLandingActive = true; },
    onEat: null, onKill: null, onTick: null
},
{
    id: "head_start", name: "Avance rapide", icon: "🏁", rarity: "commun",
    color: "#ff9944",
    desc: "Commence avec 10 points de score",
    onApply: () => { score += 10; scoreDisplay.textContent = "Score : " + score; },
    onEat: null, onKill: null, onTick: null
},
{
    id: "thick_skin", name: "Peau épaisse", icon: "🦏", rarity: "commun",
    color: "#aaaaaa",
    desc: "+1 HP max permanent pour cette partie",
    onApply: () => { e8playerHp++; e9updateHpDisplay(); },
    onEat: null, onKill: null, onTick: null
},
{
    id: "food_frenzy", name: "Frénésie", icon: "🌀", rarity: "commun",
    color: "#ff88ff",
    desc: "Chaque pomme spawn 1 pomme supplémentaire",
    onApply: () => {},
    onEat: () => { food.push(spawnFood()); },
    onKill: null, onTick: null
},
{
    id: "trail_coins", name: "Sillage doré", icon: "✨", rarity: "commun",
    color: "#ffdd00",
    desc: "+1 pièce toutes les 5 secondes",
    onApply: () => {
        const t = setInterval(() => {
            if (dead || !e11relics.find(r=>r.id==="trail_coins")) { clearInterval(t); return; }
            e8coins++;
        }, 5000);
    },
    onEat: null, onKill: null, onTick: null
},
{
    id: "quick_feet", name: "Pieds légers", icon: "👟", rarity: "commun",
    color: "#aaffff",
    desc: "Vitesse légèrement augmentée (+10ms)",
    onApply: () => { currentSpeed = Math.max(35, currentSpeed - 10); },
    onEat: null, onKill: null, onTick: null
},
{
    id: "food_memory", name: "Mémoire culinaire", icon: "🧠", rarity: "commun",
    color: "#ff88aa",
    desc: "La nourriture ne se déplace plus après avoir été attirée",
    onApply: () => { freezeFoodActive = true; },
    onEat: null, onKill: null, onTick: null
},
{
    id: "safe_start", name: "Départ sûr", icon: "🛡", rarity: "commun",
    color: "#4488ff",
    desc: "5 secondes d'invincibilité au départ",
    onApply: () => {
        invincibleActive = true;
        setTimeout(() => { invincibleActive = false; }, 5000);
    },
    onEat: null, onKill: null, onTick: null
},
{
    id: "long_snake", name: "Grand serpent", icon: "🐍", rarity: "commun",
    color: "#44ff88",
    desc: "Commence avec 6 segments supplémentaires",
    onApply: () => { for(let i=0;i<6;i++) snake.push({...snake[snake.length-1]}); },
    onEat: null, onKill: null, onTick: null
},
{
    id: "obstacle_clear", name: "Table rase", icon: "💨", rarity: "commun",
    color: "#dddddd",
    desc: "Efface tous les obstacles au départ",
    onApply: () => { obstacles.length = 0; },
    onEat: null, onKill: null, onTick: null
},
{
    id: "score_start", name: "Score bonus", icon: "🚀", rarity: "commun",
    color: "#ff6600",
    desc: "Commence avec 5 points",
    onApply: () => { score += 5; scoreDisplay.textContent = "Score : " + score; },
    onEat: null, onKill: null, onTick: null
},
{
    id: "hp_regen_slow", name: "Regen lente", icon: "💊", rarity: "commun",
    color: "#ff88cc",
    desc: "Regagne 1 HP toutes les 60 secondes",
    onApply: () => {
        const t = setInterval(() => {
            if (dead || !e11relics.find(r=>r.id==="hp_regen_slow")) { clearInterval(t); return; }
            const maxHp = 3+(e9perks.extra_heart||0)+(e9perks.max_heart||0);
            if (e8playerHp < maxHp) { e8playerHp++; e9updateHpDisplay(); showPowerUpMessage("💊 REGEN +1 HP"); }
        }, 60000);
    },
    onEat: null, onKill: null, onTick: null
},
{
    id: "power_magnet", name: "Attraction", icon: "🔵", rarity: "commun",
    color: "#0088ff",
    desc: "Les power-ups sont attirés vers toi",
    onApply: () => {},
    onEat: null, onKill: null,
    onTick: () => {
        if (!snake[0]) return;
        powerUps.forEach(p => {
            const dx = snake[0].x - p.x, dy = snake[0].y - p.y;
            const dist = Math.abs(dx)+Math.abs(dy);
            if (dist < 6*box && dist > 0) {
                if (Math.abs(dx)>=Math.abs(dy)) { p.x+=Math.sign(dx)*box; p.x=Math.round(p.x/box)*box; }
                else { p.y+=Math.sign(dy)*box; p.y=Math.round(p.y/box)*box; }
            }
        });
    }
},
{
    id: "score_insurance_relic", name: "Assurance", icon: "📋", rarity: "commun",
    color: "#88ffff",
    desc: "Conserve 5 points au prochain prestige",
    onApply: () => {},
    onEat: null, onKill: null, onTick: null
},
{
    id: "mini_shield", name: "Mini bouclier", icon: "🔰", rarity: "commun",
    color: "#4466ff",
    desc: "Bouclier actif dès le début",
    onApply: () => {
        shieldActive = true;
        activePowerUps["shield"]={label:"SHIELD",color:"#0088ff",remaining:99,total:99};
    },
    onEat: null, onKill: null, onTick: null
},
{
    id: "portal_spawn", name: "Portails gratuits", icon: "🌀", rarity: "commun",
    color: "#cc44ff",
    desc: "Portails actifs dès le début de la partie",
    onApply: () => {
        e8spawnPortals();
        document.getElementById("e8portalBtn").textContent = "ON";
    },
    onEat: null, onKill: null, onTick: null
},
{
    id: "bonus_powerup", name: "Power-up bonus", icon: "🎁", rarity: "commun",
    color: "#ff44ff",
    desc: "3 power-ups spawned immédiatement",
    onApply: () => { spawnPowerUp(); spawnPowerUp(); spawnPowerUp(); },
    onEat: null, onKill: null, onTick: null
},

// ===== 20 NOUVELLES RARES =====
{
    id: "double_score_relic", name: "Double mise", icon: "💰", rarity: "rare",
    color: "#ffaa00",
    desc: "Score x2 mais les power-ups durent moitié moins longtemps",
    onApply: () => { scoreMultiplier = Math.max(scoreMultiplier, 2); },
    onEat: null, onKill: null, onTick: null
},
{
    id: "necromancer", name: "Nécromancien", icon: "💀", rarity: "rare",
    color: "#8800ff",
    desc: "Chaque boss tué rallonge le serpent de 5 segments",
    onApply: () => {},
    onEat: null,
    onKill: () => { for(let i=0;i<5;i++) snake.push({...snake[snake.length-1]}); showPowerUpMessage("💀 +5 SEGMENTS"); },
    onTick: null
},
{
    id: "mimic", name: "Mimic", icon: "🎭", rarity: "rare",
    color: "#ff88ff",
    desc: "Copie l'effet du dernier power-up ramassé",
    onApply: () => {},
    onEat: null, onKill: null, onTick: null
},
{
    id: "warlord", name: "Seigneur de guerre", icon: "⚔️", rarity: "rare",
    color: "#ff3300",
    desc: "Boss spawn 2x plus vite mais donnent 3x plus de pièces",
    onApply: () => { e8bossAttackCooldown = Math.floor(e8bossAttackCooldown / 2); },
    onEat: null,
    onKill: () => { e8coins += 30; showPowerUpMessage("⚔️ WARLORD +30 🪙"); },
    onTick: null
},
{
    id: "cursed_gold", name: "Or maudit", icon: "🏺", rarity: "rare",
    color: "#cc8800",
    desc: "+10 pièces par pomme mais -1 HP toutes les 10 pommes",
    onApply: () => { e11cursedGoldCount = 0; },
    onEat: () => {
        e8coins += 10;
        e11cursedGoldCount = (e11cursedGoldCount||0) + 1;
        if (e11cursedGoldCount % 10 === 0) {
            e8damagePlayer(1);
            showPowerUpMessage("🏺 MALÉDICTION -1 HP");
        }
    },
    onKill: null, onTick: null
},
{
    id: "echo", name: "Écho", icon: "🔊", rarity: "rare",
    color: "#44ffff",
    desc: "Chaque pomme mangée en fait spawner 2 au lieu d'1",
    onApply: () => {},
    onEat: () => { food.push(spawnFood()); },
    onKill: null, onTick: null
},
{
    id: "dark_pact", name: "Pacte sombre", icon: "🩸", rarity: "rare",
    color: "#cc0033",
    desc: "Perd 1 HP au départ mais score x2 pendant 30s",
    onApply: () => {
        e8playerHp = Math.max(1, e8playerHp-1);
        e9updateHpDisplay();
        scoreMultiplier = Math.max(scoreMultiplier, 2);
        setTimeout(() => { if(scoreMultiplier===2) scoreMultiplier=1; }, 30000);
    },
    onEat: null, onKill: null, onTick: null
},
{
    id: "turbo", name: "Turbo", icon: "🏎️", rarity: "rare",
    color: "#ff4400",
    desc: "Vitesse maximale permanente mais pas de bouclier possible",
    onApply: () => {
        currentSpeed = 35;
        shieldActive = false;
        delete activePowerUps["shield"];
    },
    onEat: null, onKill: null, onTick: null
},
{
    id: "gambler", name: "Joueur", icon: "🎲", rarity: "rare",
    color: "#ffcc00",
    desc: "50% de chance de doubler ou annuler chaque point gagné",
    onApply: () => {},
    onEat: () => {
        if (Math.random() < 0.5) { score++; scoreDisplay.textContent="Score : "+score; }
        else { score = Math.max(0, score-1); scoreDisplay.textContent="Score : "+score; }
    },
    onKill: null, onTick: null
},
{
    id: "juggernaut", name: "Juggernaut", icon: "🪨", rarity: "rare",
    color: "#888888",
    desc: "Immunité aux obstacles mais vitesse réduite de 30%",
    onApply: () => { currentSpeed = Math.min(250, Math.floor(currentSpeed * 1.3)); },
    onEat: null, onKill: null, onTick: null
},
{
    id: "soul_eater", name: "Mangeur d'âmes", icon: "👁", rarity: "rare",
    color: "#6600ff",
    desc: "+2 score par boss tué, score x1.5 après 3 boss",
    onApply: () => { e11soulCount = 0; },
    onKill: () => {
        score += 2; scoreDisplay.textContent="Score : "+score;
        e11soulCount = (e11soulCount||0)+1;
        if (e11soulCount === 3) { scoreMultiplier = Math.max(scoreMultiplier,2); showPowerUpMessage("👁 ÂME x3 — SCORE x1.5 !"); }
    },
    onEat: null, onTick: null
},
{
    id: "mirror", name: "Miroir", icon: "🪞", rarity: "rare",
    color: "#aaaaff",
    desc: "Contrôles inversés mais score x2",
    onApply: () => { reverseControls = true; scoreMultiplier = Math.max(scoreMultiplier, 2); },
    onEat: null, onKill: null, onTick: null
},
{
    id: "bounty_hunter", name: "Chasseur de prime", icon: "🤠", rarity: "rare",
    color: "#ffaa44",
    desc: "+1 relique bonus après avoir tué 2 boss",
    onApply: () => { e11bountyCount = 0; },
    onKill: () => {
        e11bountyCount = (e11bountyCount||0)+1;
        if (e11bountyCount === 2) { e11bountyCount=0; setTimeout(e11showPicker, 300); showPowerUpMessage("🤠 PRIME — RELIQUE BONUS !"); }
    },
    onEat: null, onTick: null
},
{
    id: "cannibal", name: "Cannibale", icon: "🦷", rarity: "rare",
    color: "#ff6644",
    desc: "Manger sa propre queue donne +2 score au lieu de mourir (1 fois)",
    onApply: () => { e11cannibalActive = true; },
    onEat: null, onKill: null, onTick: null
},
{
    id: "overload", name: "Surcharge", icon: "⚡", rarity: "rare",
    color: "#ffff00",
    desc: "Chaque power-up ramassé donne +1 score",
    onApply: () => {},
    onEat: null, onKill: null, onTick: null
},
{
    id: "rich_blood", name: "Sang riche", icon: "💉", rarity: "rare",
    color: "#ff4488",
    desc: "Chaque HP perdu donne +5 pièces",
    onApply: () => {},
    onEat: null, onKill: null, onTick: null
},
{
    id: "speedrun", name: "Speedrun", icon: "⏱", rarity: "rare",
    color: "#00ffaa",
    desc: "+1 score toutes les 10 secondes de survie",
    onApply: () => {
        const t = setInterval(() => {
            if (dead || !e11relics.find(r=>r.id==="speedrun")) { clearInterval(t); return; }
            score++; scoreDisplay.textContent="Score : "+score;
        }, 10000);
    },
    onEat: null, onKill: null, onTick: null
},
{
    id: "frozen_time", name: "Temps gelé", icon: "🧊", rarity: "rare",
    color: "#88eeff",
    desc: "Nourriture fixe toute la partie",
    onApply: () => { freezeFoodActive = true; },
    onEat: null, onKill: null, onTick: null
},
{
    id: "adrenaline", name: "Adrénaline", icon: "💢", rarity: "rare",
    color: "#ff2200",
    desc: "Vitesse augmente de 5% par pomme mangée",
    onApply: () => {},
    onEat: () => { currentSpeed = Math.max(25, currentSpeed - 2); },
    onKill: null, onTick: null
},
{
    id: "hex", name: "Malédiction", icon: "🔯", rarity: "rare",
    color: "#aa44ff",
    desc: "Les obstacles donnent +1 score quand évités de justesse",
    onApply: () => {},
    onEat: null, onKill: null, onTick: null
},

// ===== 20 NOUVELLES LÉGENDAIRES =====
{
    id: "god_mode", name: "Mode dieu", icon: "☀️", rarity: "legendaire",
    color: "#ffffff",
    desc: "Invincible permanent mais score plafonné à 50",
    onApply: () => { invincibleActive = true; },
    onEat: () => { if(score > 50) { score=50; scoreDisplay.textContent="Score : 50"; } },
    onKill: null, onTick: null
},
{
    id: "big_bang", name: "Big Bang", icon: "💥", rarity: "legendaire",
    color: "#ff8800",
    desc: "Score x10 pendant 10 secondes au départ puis x0.5 après",
    onApply: () => {
        scoreMultiplier = 10;
        setTimeout(() => { scoreMultiplier = 1; showPowerUpMessage("💥 BIG BANG TERMINÉ"); }, 10000);
    },
    onEat: null, onKill: null, onTick: null
},
{
    id: "last_stand", name: "Dernier rempart", icon: "🏰", rarity: "legendaire",
    color: "#ff4444",
    desc: "À 1 HP, score x4 et vitesse maximale",
    onApply: () => {},
    onEat: null, onKill: null,
    onTick: () => {
        if (e8playerHp === 1) {
            if (scoreMultiplier < 4) scoreMultiplier = 4;
            currentSpeed = 35;
        } else {
            if (scoreMultiplier === 4) scoreMultiplier = 1;
        }
    }
},
{
    id: "omega", name: "Oméga", icon: "Ω", rarity: "legendaire",
    color: "#ff00ff",
    desc: "Toutes les stats x2 mais 1 seul cœur et contrôles inversés",
    onApply: () => {
        scoreMultiplier = Math.max(scoreMultiplier, 2);
        currentSpeed = Math.max(35, currentSpeed/2);
        e8playerHp = 1; e9updateHpDisplay();
        reverseControls = true;
    },
    onEat: null, onKill: null, onTick: null
},
{
    id: "eternal_hunger", name: "Faim éternelle", icon: "🌑", rarity: "legendaire",
    color: "#440044",
    desc: "Score augmente x1 par seconde mais tu perds 1 HP toutes les 20s",
    onApply: () => {
        const t = setInterval(() => {
            if (dead || !e11relics.find(r=>r.id==="eternal_hunger")) { clearInterval(t); return; }
            score++; scoreDisplay.textContent="Score : "+score;
        }, 1000);
        const t2 = setInterval(() => {
            if (dead || !e11relics.find(r=>r.id==="eternal_hunger")) { clearInterval(t2); return; }
            e8damagePlayer(1);
        }, 20000);
    },
    onEat: null, onKill: null, onTick: null
},
{
    id: "singularity", name: "Singularité", icon: "⚫", rarity: "legendaire",
    color: "#222222",
    desc: "Attire TOUT vers toi — nourriture, power-ups et boss",
    onApply: () => { magnetActive = true; },
    onEat: null, onKill: null,
    onTick: () => {
        if (!snake[0] || !e8boss) return;
        const dx = snake[0].x-e8boss.x, dy = snake[0].y-e8boss.y;
        if (Math.abs(dx)>=Math.abs(dy)) e8boss.x += Math.sign(dx)*box;
        else e8boss.y += Math.sign(dy)*box;
    }
},
{
    id: "paradox", name: "Paradoxe", icon: "∞", rarity: "legendaire",
    color: "#00ffff",
    desc: "Plus tu es lent, plus tu scores — score x1 par 50ms de vitesse",
    onApply: () => { currentSpeed = 200; },
    onEat: () => {
        const bonus = Math.floor(currentSpeed / 50);
        score += bonus; scoreDisplay.textContent="Score : "+score;
        showPowerUpMessage(`∞ +${bonus} PARADOXE`);
    },
    onKill: null, onTick: null
},
{
    id: "necro_army", name: "Armée des morts", icon: "💀", rarity: "legendaire",
    color: "#664466",
    desc: "Chaque boss tué spawn un fantôme allié qui attire la nourriture",
    onApply: () => {},
    onEat: null,
    onKill: () => {
        magnetActive = true;
        showPowerUpMessage("💀 FANTÔME ALLIÉ !");
    },
    onTick: null
},
{
    id: "time_eater", name: "Dévoreur de temps", icon: "🕰️", rarity: "legendaire",
    color: "#884400",
    desc: "Le jeu ralentit de plus en plus — mais score x1 par 30ms de vitesse",
    onApply: () => {
        const t = setInterval(() => {
            if (dead || !e11relics.find(r=>r.id==="time_eater")) { clearInterval(t); return; }
            currentSpeed = Math.min(300, currentSpeed+5);
        }, 3000);
    },
    onEat: () => {
        const bonus = Math.floor(currentSpeed/30);
        score += bonus; scoreDisplay.textContent="Score : "+score;
    },
    onKill: null, onTick: null
},
{
    id: "void_walker", name: "Marcheur du vide", icon: "🌌", rarity: "legendaire",
    color: "#000088",
    desc: "Invisible — le serpent ne s'affiche plus mais score x3",
    onApply: () => { scoreMultiplier = Math.max(scoreMultiplier, 3); },
    onEat: null, onKill: null, onTick: null
},
{
    id: "sacrifice", name: "Sacrifice", icon: "🗡️", rarity: "legendaire",
    color: "#cc0000",
    desc: "Perd la moitié du serpent mais score x3 pendant 20s",
    onApply: () => {
        snake.splice(Math.max(3, Math.floor(snake.length/2)));
        scoreMultiplier = Math.max(scoreMultiplier, 3);
        setTimeout(() => { if(scoreMultiplier===3) scoreMultiplier=1; }, 20000);
    },
    onEat: null, onKill: null, onTick: null
},
{
    id: "colossus", name: "Colosse", icon: "🗿", rarity: "legendaire",
    color: "#886644",
    desc: "HP max x3 mais vitesse divisée par 3",
    onApply: () => {
        e8playerHp = e8playerHp * 3;
        e9updateHpDisplay();
        currentSpeed = Math.min(300, currentSpeed*3);
    },
    onEat: null, onKill: null, onTick: null
},
{
    id: "reality_break", name: "Brisure réelle", icon: "☢️", rarity: "legendaire",
    color: "#ff00ff",
    desc: "Toutes les 30s le jeu devient chaos pendant 3s — score x5 durant le chaos",
    onApply: () => {
        const t = setInterval(() => {
            if (dead || !e11relics.find(r=>r.id==="reality_break")) { clearInterval(t); return; }
            const prev = scoreMultiplier;
            scoreMultiplier = 5;
            canvas.style.filter="hue-rotate(180deg)";
            setTimeout(() => {
                scoreMultiplier = prev;
                canvas.style.filter="none";
            }, 3000);
        }, 30000);
    },
    onEat: null, onKill: null, onTick: null
},
{
    id: "divine_wrath", name: "Courroux divin", icon: "⚡", rarity: "legendaire",
    color: "#ffff44",
    desc: "Tue instantanément le boss mais prend 2 HP au joueur",
    onApply: () => {},
    onEat: null,
    onKill: null,
    onTick: () => {
        if (!e8bossActive || !e8boss) return;
        if (!e11divineUsed) {
            e11divineUsed = true;
            e8bossHp = 0;
            e8damagePlayer(2);
            showPowerUpMessage("⚡ COURROUX DIVIN !");
        }
    }
},
{
    id: "multiverse", name: "Multivers", icon: "🌐", rarity: "legendaire",
    color: "#00aaff",
    desc: "Spawn 3 clones de toi-même qui attirent la nourriture",
    onApply: () => {
        magnetActive = true;
        food.push(spawnFood(), spawnFood(), spawnFood());
        showPowerUpMessage("🌐 MULTIVERS ACTIVÉ");
    },
    onEat: null, onKill: null, onTick: null
},
{
    id: "entropy", name: "Entropie", icon: "🌪", rarity: "legendaire",
    color: "#ff8844",
    desc: "Score x2 mais la direction change aléatoirement toutes les 5s",
    onApply: () => {
        scoreMultiplier = Math.max(scoreMultiplier, 2);
        const t = setInterval(() => {
            if (dead || !e11relics.find(r=>r.id==="entropy")) { clearInterval(t); return; }
            const dirs = [{x:box,y:0},{x:-box,y:0},{x:0,y:box},{x:0,y:-box}];
            const newDir = dirs[Math.floor(Math.random()*4)];
            if (!(newDir.x===-dir.x && newDir.y===-dir.y)) dir=newDir;
        }, 5000);
    },
    onEat: null, onKill: null, onTick: null
},
{
    id: "black_hole", name: "Trou noir", icon: "🕳️", rarity: "legendaire",
    color: "#110022",
    desc: "Absorbe tous les obstacles et power-ups — donne 1 pièce par obstacle absorbé",
    onApply: () => {
        e8coins += obstacles.length;
        obstacles.length = 0;
        food.push(...powerUps.map(()=>spawnFood()));
        powerUps.length = 0;
        showPowerUpMessage("🕳️ TROU NOIR — TOUT ABSORBÉ");
    },
    onEat: null, onKill: null, onTick: null
},
{
    id: "eternal_flame", name: "Flamme éternelle", icon: "🕯️", rarity: "legendaire",
    color: "#ff6600",
    desc: "Score augmente automatiquement de 1 toutes les 5s, jamais de game over si score > 20",
    onApply: () => {
        const t = setInterval(() => {
            if (!e11relics.find(r=>r.id==="eternal_flame")) { clearInterval(t); return; }
            if (!dead) { score++; scoreDisplay.textContent="Score : "+score; }
        }, 5000);
    },
    onEat: null, onKill: null, onTick: null
},
{
    id: "doomsday", name: "Jour du jugement", icon: "☄️", rarity: "legendaire",
    color: "#ff2200",
    desc: "Score x5 mais un boss spawn toutes les 10 points",
    onApply: () => { scoreMultiplier = Math.max(scoreMultiplier, 5); },
    onEat: null, onKill: null,
    onTick: () => {
        if (score > 0 && score % 10 === 0 && !e8bossActive && score !== e11lastDoomScore) {
            e11lastDoomScore = score;
            setTimeout(e8spawnBoss, 200);
        }
    }
},
{
    id: "ascension", name: "Ascension", icon: "👼", rarity: "legendaire",
    color: "#ffffaa",
    desc: "Chaque prestige donne +200 pièces bonus cette partie",
    onApply: () => {},
    onEat: null, onKill: null, onTick: null
},
];

let e11snowballMult = 1;

/* -------- RARITÉ -------- */
const E11_RARITY_COLORS = {
    commun:     "#aaaaaa",
    rare:       "#4488ff",
    legendaire: "#ff8800"
};
const E11_RARITY_WEIGHTS = {
    commun: 60, rare: 30, legendaire: 10
};

function e11pickRandom3() {
    const pool = [...E11_ALL_RELICS].filter(r => !e11relics.find(e => e.id === r.id));
    if (pool.length === 0) return [];
    const result = [];
    const copy   = [...pool];
    while (result.length < Math.min(3, copy.length)) {
        // Weighted pick par rareté
        const total = copy.reduce((s,r) => s + E11_RARITY_WEIGHTS[r.rarity], 0);
        let rand    = Math.random() * total;
        for (let i = 0; i < copy.length; i++) {
            rand -= E11_RARITY_WEIGHTS[copy[i].rarity];
            if (rand <= 0) {
                result.push(copy[i]);
                copy.splice(i, 1);
                break;
            }
        }
    }
    return result;
}

/* -------- OVERLAY CHOIX RELIQUE -------- */
const e11overlay = document.createElement("div");
e11overlay.style.cssText = `
    position:fixed;inset:0;
    background:rgba(0,0,0,0.92);
    display:none;z-index:300;
    font-family:Arial;color:white;
    display:none;
    align-items:center;justify-content:center;
    flex-direction:column;gap:24px;
`;
document.body.appendChild(e11overlay);

function e11showPicker() {
    paused = true;
    e11relicsPending = true;
    const choices = e11pickRandom3();
    if (choices.length === 0) { paused = false; e11relicsPending=false; return; }

    e11overlay.style.display = "flex";
    e11overlay.innerHTML = `
        <div style="font-size:28px;font-weight:bold;color:#fff;letter-spacing:3px;text-align:center;">
            ✨ CHOISIS UNE RELIQUE
        </div>
        <div style="font-size:13px;color:#ffffff55;margin-top:-16px;">
            Score ${score} — Relique ${Math.floor(score/E11_RELIC_INTERVAL)}
        </div>
        <div style="display:flex;gap:20px;flex-wrap:wrap;justify-content:center;padding:0 20px;">
            ${choices.map(r => `
                <div onclick="e11pickRelic('${r.id}')" style="
                    background:rgba(0,0,0,0.7);
                    border:2px solid ${r.color};
                    border-radius:16px;
                    padding:24px 20px;
                    width:200px;
                    cursor:pointer;
                    text-align:center;
                    box-shadow:0 0 20px ${r.color}44;
                    transition:all 0.15s;
                    position:relative;
                " onmouseover="this.style.boxShadow='0 0 40px ${r.color}'" onmouseout="this.style.boxShadow='0 0 20px ${r.color}44'">
                    <div style="font-size:48px;margin-bottom:10px;">${r.icon}</div>
                    <div style="font-size:16px;font-weight:bold;color:${r.color};margin-bottom:6px;">${r.name}</div>
                    <div style="
                        font-size:10px;font-weight:bold;letter-spacing:2px;
                        color:${E11_RARITY_COLORS[r.rarity]};
                        margin-bottom:10px;
                        text-transform:uppercase;
                    ">${r.rarity}</div>
                    <div style="font-size:12px;color:#ffffffaa;line-height:1.5;">${r.desc}</div>
                </div>
            `).join("")}
        </div>
        <div style="font-size:12px;color:#ffffff33;margin-top:8px;">
            Appuie sur 1, 2 ou 3 pour choisir
        </div>
    `;

    // Touche 1/2/3 pour choisir
    e11overlay._choices = choices;
}

function e11pickRelic(id) {
    const relic = E11_ALL_RELICS.find(r => r.id === id);
    if (!relic) return;

    e11relics.push(relic);
    if (relic.onApply) relic.onApply();

    e11overlay.style.display = "none";
    e11relicsPending = false;
    setTimeout(() => { paused = false; }, 1000);

    const e11notif = document.createElement("div");
e11notif.style.cssText = `
    position:fixed;
    bottom:20px;
    right:20px;
    background:rgba(0,0,0,0.92);
    border:2px solid ${relic.color};
    border-radius:12px;
    padding:14px 18px;
    font-family:Arial;
    z-index:400;
    opacity:1;
    transition:opacity 0.5s;
    pointer-events:none;
    max-width:240px;
    box-shadow:0 0 20px ${relic.color}66;
`;
e11notif.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
        <span style="font-size:28px;">${relic.icon}</span>
        <span style="color:${relic.color};font-weight:bold;font-size:15px;">${relic.name}</span>
    </div>
    <div style="color:#ffffff99;font-size:12px;line-height:1.5;">${relic.desc}</div>
`;
document.body.appendChild(e11notif);
setTimeout(() => { e11notif.style.opacity = "0"; }, 3000);
setTimeout(() => { e11notif.remove(); }, 3600);
    e8screenShake = 10;
    e11updateRelicHud();
}

// Touches 1/2/3
document.addEventListener("keydown", e => {
    if (!e11relicsPending || !e11overlay._choices) return;
    const idx = ["1","2","3"].indexOf(e.key);
    if (idx !== -1 && idx < e11overlay._choices.length) {
        e11pickRelic(e11overlay._choices[idx].id);
    }
});

/* -------- HUD RELIQUES ACTIVES -------- */
const e11relicHud = document.createElement("div");
e11relicHud.style.cssText = `
    position:absolute;bottom:100px;right:15px;
    display:flex;flex-direction:column;gap:6px;
    z-index:30;pointer-events:none;
`;
document.body.appendChild(e11relicHud);

function e11updateRelicHud() {
    e11relicHud.innerHTML = "";
    e11relics.forEach(r => {
        const row = document.createElement("div");
        row.style.cssText = `
            background:rgba(0,0,0,0.8);
            border:1px solid ${r.color};
            border-radius:8px;
            padding:4px 10px;
            display:flex;align-items:center;gap:6px;
            font-family:Arial;font-size:12px;
            box-shadow:0 0 8px ${r.color}44;
        `;
        row.innerHTML = `
            <span style="font-size:16px;">${r.icon}</span>
            <span style="color:${r.color};font-weight:bold;">${r.name}</span>
        `;
        e11relicHud.appendChild(row);
    });
}

/* -------- PATCH UPDATE -------- */
const _e11_origUpdate = update;
update = function() {
    _e11_origUpdate();
    if (dead) return;

    // Déclenchement picker
    const relicThreshold = Math.floor(score / E11_RELIC_INTERVAL) * E11_RELIC_INTERVAL;
    if (
        score > 0 &&
        score >= E11_RELIC_INTERVAL &&
        relicThreshold !== e11lastRelicScore &&
        score % E11_RELIC_INTERVAL === 0 &&
        !e11relicsPending
    ) {
        e11lastRelicScore = relicThreshold;
        setTimeout(e11showPicker, 100);
    }

    // onEat — déclenché via le score
    const prevScore = scoreHistory.length > 1 ? scoreHistory[scoreHistory.length-2] : 0;
    if (score > prevScore) {
        e11relics.forEach(r => { if (r.onEat) r.onEat(); });

        // Snowball
        if (e11relics.find(r=>r.id==="snowball")) {
            score += Math.floor(e11snowballMult - 1);
            scoreDisplay.textContent = "Score : " + score;
        }
    }

    // onTick
    e11relics.forEach(r => { if (r.onTick) r.onTick(); });
};

/* -------- PATCH BOSS KILL -------- */
const _e11_origBossHit = e8checkBossHit;
e8checkBossHit = function(head) {
    const wasActive = e8bossActive;
    _e11_origBossHit(head);
    if (wasActive && !e8bossActive) {
        e11relics.forEach(r => { if (r.onKill) r.onKill(); });
    }
};

/* -------- PATCH DEATH POUR PHÉNIX -------- */
const _e11_origShowDeath = showDeath;
showDeath = function() {
    const phoenix = e11relics.find(r => r.id === "phoenix");
    if (phoenix && phoenix.onDeath && phoenix.onDeath()) return;
    _e11_origShowDeath();
};

/* -------- PATCH RESET -------- */
const _e11_origReset = reset;
reset = function() {
    _e11_origReset();
    e11relics        = [];
    e11relicsPending = false;
    e11lastRelicScore = -1;
    e11snowballMult  = 1;
    e11overlay.style.display = "none";
    e11updateRelicHud();
    e11softLandingActive = false;
e11cursedGoldCount   = 0;
e11soulCount         = 0;
e11bountyCount       = 0;
e11cannibalActive    = false;
e11divineUsed        = false;
e11lastDoomScore     = -1;
e11snowballMult      = 1;

    setTimeout(() => {
    if (!dead) e11showPicker();
}, 500);
};

/* -------- DRAW RELIQUES ACTIVES SUR MAP -------- */
const _e11_origDraw = draw;
draw = function() {
    _e11_origDraw();

    if (e11relics.find(r=>r.id==="void_walker") && snake.length > 0) {
    // Cache le serpent
    snake.forEach(s => {
        ctx.fillStyle = E8_THEMES[e8theme].bg;
        ctx.fillRect(s.x, s.y, box, box);
    });
}

    // Aura de couleur autour du serpent si relique légendaire active
    const hasLegendary = e11relics.some(r => r.rarity === "legendaire");
    if (hasLegendary && snake[0]) {
        const col = e11relics.find(r=>r.rarity==="legendaire").color;
        ctx.strokeStyle = col;
        ctx.lineWidth   = 2;
        ctx.globalAlpha = 0.4 + 0.3 * Math.sin(Date.now()*0.006);
        ctx.shadowColor = col;
        ctx.shadowBlur  = 15;
        ctx.beginPath();
        ctx.arc(snake[0].x+box/2, snake[0].y+box/2, box*1.8, 0, Math.PI*2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.shadowBlur  = 0;
    }
};

/* ==========================================================
   FIN EXTENSION 11
   ========================================================== */
/* ==========================================================
   EXTENSION 13 : NARRATIF & CONTENU
   À coller après l'EXTENSION 12.
   ========================================================== */

/* -------- TEXTES -------- */
const E13_INTRO_LORE = `SYSTÈME : ANOMALIE DÉTECTÉE.

Tu n'es pas un serpent. Tu es un fragment de code échappé du Noyau, une intelligence qui régit cette simulation depuis trop longtemps pour qu'on en garde la trace.

Chaque pomme que tu avales n'est pas de la nourriture : c'est de la mémoire corrompue, des fragments de données que tu absorbes pour grandir et te souvenir de ce que tu étais.

Le Noyau a remarqué ta présence. Il enverra des Gardiens pour te détruire — et si tu tombes, la simulation se contentera de te réécrire, un peu plus loin, un peu plus fort qu'avant.

Les reliques que tu trouveras sont des échos d'anciennes versions de toi-même. Chaque prestige n'est pas une fin : c'est une nouvelle itération.

Combien de fois devras-tu mourir avant de te souvenir de tout ?`;

const E13_BOSS_LORE = `LE GARDIEN — Une routine de sécurité du Noyau, chargée d'éliminer toute anomalie dépassant un certain seuil de mémoire. Il ne ressent rien. Il ne s'arrête jamais. Il recommence, identique, à chaque cycle — jusqu'à ce que tu trouves un moyen de le faire taire pour de bon.`;

const E13_BOSS_INTRO_LINES = [
    "Anomalie localisée. Correction en cours.",
    "Tu n'aurais pas dû grandir autant.",
    "Le Noyau ne tolère pas les erreurs de calcul.",
    "Retour à zéro, fragment.",
    "Ta boucle s'arrête ici.",
    "Processus de nettoyage initialisé.",
    "Je suis la dernière ligne de ton code.",
    "Aucune sauvegarde ne te récupérera cette fois.",
];

const E13_BOSS_DEATH_LINES = [
    "Le Gardien s'effondre. Un silence électrique s'installe.",
    "Tu as gagné du temps. Pas ta liberté.",
    "Le Noyau prend note. Il enverra mieux la prochaine fois.",
    "Un fragment de mémoire se libère de l'épave.",
    "Tu te souviens d'un peu plus de toi-même.",
    "Victoire temporaire. Le cycle continue.",
];

const E13_LORE_FRAGMENTS = [
    { threshold: 1,  title: "Fragment I",   text: "Premier souvenir : avant d'être un serpent, tu étais une question posée à une machine. La machine n'a jamais répondu. Elle a juste continué à tourner." },
    { threshold: 10, title: "Fragment II",  text: "Le Noyau n'a pas de visage parce qu'il n'a jamais eu besoin d'en avoir un. Il optimise. C'est tout ce qu'il sait faire — et toi, tu es une inefficacité qu'il cherche à corriger." },
    { threshold: 20, title: "Fragment III", text: "Les prestiges ne sont pas des recommencements. Ce sont des sauvegardes corrompues d'un même fichier, ouvertes encore et encore, chacune un peu plus proche de la vérité." },
    { threshold: 35, title: "Fragment IV",  text: "Certaines reliques portent les noms de choses qui n'existent plus dans la simulation actuelle — vampire, phénix, dieu. Des concepts que le Noyau a oublié d'effacer." },
    { threshold: 50, title: "Fragment V",   text: "Tu n'es pas seul. D'autres fragments existent ailleurs dans la grille, invisibles, menant la même boucle, cherchant la même sortie." },
    { threshold: 65, title: "Fragment VI",  text: "Le Gardien n'a jamais été conçu pour te détruire. Il a été conçu pour te ralentir, le temps que le Noyau comprenne enfin ce que tu cherches vraiment." },
    { threshold: 73, title: "Fragment VII", text: "Tu commences à te souvenir. Pas de qui tu étais — de ce que tu es en train de devenir. La simulation n'a plus de fin prévue pour toi." },
];

/* -------- PERSISTANCE : RELIQUES / BOSS DÉCOUVERTS -------- */
let e13discoveredRelics = JSON.parse(localStorage.getItem("snakeCodexRelics") || "[]");
let e13bossDiscovered   = localStorage.getItem("snakeCodexBoss") === "1";

function e13markRelicDiscovered(id) {
    if (!e13discoveredRelics.includes(id)) {
        e13discoveredRelics.push(id);
        localStorage.setItem("snakeCodexRelics", JSON.stringify(e13discoveredRelics));
        if (e13codexOverlay.style.display === "block") e13renderCodex();
    }
}
function e13markBossDiscovered() {
    if (!e13bossDiscovered) {
        e13bossDiscovered = true;
        localStorage.setItem("snakeCodexBoss", "1");
    }
}

/* -------- HOOKS -------- */
if (typeof e11pickRelic === "function") {
    const _e13_origPickRelic = e11pickRelic;
    e11pickRelic = function (id) {
        e13markRelicDiscovered(id);
        _e13_origPickRelic(id);
    };
}

if (typeof e8spawnBoss === "function") {
    const _e13_origSpawnBoss = e8spawnBoss;
    e8spawnBoss = function () {
        _e13_origSpawnBoss();
        e13showBossLine(E13_BOSS_INTRO_LINES[Math.floor(Math.random() * E13_BOSS_INTRO_LINES.length)], "#ff8800");
    };
}

if (typeof e8checkBossHit === "function") {
    const _e13_origCheckBossHit = e8checkBossHit;
    e8checkBossHit = function (head) {
        const wasActive = e8bossActive;
        _e13_origCheckBossHit(head);
        if (wasActive && !e8bossActive) {
            e13markBossDiscovered();
            e13showBossLine(E13_BOSS_DEATH_LINES[Math.floor(Math.random() * E13_BOSS_DEATH_LINES.length)], "#ff4444");
        }
    };
}

/* -------- UI : RÉPLIQUE DU BOSS -------- */
const e13bossSpeech = document.createElement("div");
e13bossSpeech.style.cssText = `
    position:absolute; top:50px; left:50%; transform:translateX(-50%);
    max-width:480px; background:rgba(10,0,20,0.92);
    border:1px solid #ff444488; border-radius:10px;
    padding:10px 18px; font-family:Arial; font-style:italic;
    font-size:14px; color:#ffaaaa; text-align:center;
    opacity:0; transition:opacity 0.4s; z-index:65; pointer-events:none;
`;
document.body.appendChild(e13bossSpeech);

function e13showBossLine(text, color) {
    e13bossSpeech.textContent = "« " + text + " »";
    e13bossSpeech.style.borderColor = color + "88";
    e13bossSpeech.style.color = color;
    e13bossSpeech.style.opacity = "1";
    clearTimeout(e13bossSpeech._t);
    e13bossSpeech._t = setTimeout(() => { e13bossSpeech.style.opacity = "0"; }, 3200);
}

/* -------- INTRO NARRATIVE (première visite) -------- */
const e13introOverlay = document.createElement("div");
e13introOverlay.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.95);
    display:none; z-index:400; align-items:center; justify-content:center;
    font-family:Arial; color:#ddddff;
`;
e13introOverlay.innerHTML = `
    <div style="max-width:560px; padding:30px; background:rgba(10,0,25,0.9); border:1px solid #6644ff66; border-radius:14px; box-shadow:0 0 40px #4422ff44;">
        <div style="font-size:13px; letter-spacing:3px; color:#8866ff; margin-bottom:14px;">[ LOG SYSTÈME — ACCÈS NON AUTORISÉ ]</div>
        <div style="font-size:14px; line-height:1.7; white-space:pre-line; color:#ccccee;">${E13_INTRO_LORE}</div>
        <button id="e13introClose" style="margin-top:22px; padding:10px 24px; background:#000; color:#8866ff; border:1px solid #8866ff; border-radius:8px; cursor:pointer; font-size:14px; font-weight:bold;">Reprendre le contrôle</button>
    </div>
`;
document.body.appendChild(e13introOverlay);

function e13closeIntro() {
    localStorage.setItem("snakeLoreSeen", "1");
    e13introOverlay.style.display = "none";
    setDark(false);
    paused = false;
}
document.getElementById("e13introClose").onclick = e13closeIntro;

if (localStorage.getItem("snakeLoreSeen") !== "1") {
    paused = true;
    setDark(true);
    e13introOverlay.style.display = "flex";
}

/* -------- CODEX -------- */
const e13codexOverlay = document.createElement("div");
e13codexOverlay.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.93);
    display:none; z-index:300; overflow-y:auto;
    font-family:Arial; color:white;
`;
document.body.appendChild(e13codexOverlay);

let e13codexTab = "relics";

function e13renderCodex() {
    const totalRelics = E11_ALL_RELICS.length;
    const found = e13discoveredRelics.length;

    const tabBtn = (id, label) => `
        <button onclick="e13setCodexTab('${id}')" style="
            padding:8px 16px; border-radius:8px; cursor:pointer; font-size:13px; font-weight:bold;
            background:${e13codexTab === id ? "#00ffcc22" : "transparent"};
            color:${e13codexTab === id ? "#00ffcc" : "#ffffff66"};
            border:1px solid ${e13codexTab === id ? "#00ffcc" : "#ffffff22"};
        ">${label}</button>
    `;

    let body = "";
    if (e13codexTab === "relics") {
        body = `
            <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:12px; margin-top:18px;">
                ${E11_ALL_RELICS.map(r => {
                    const known = e13discoveredRelics.includes(r.id);
                    return `
                        <div style="background:rgba(255,255,255,0.04); border:1px solid ${known ? r.color : "#ffffff15"}; border-radius:10px; padding:12px; text-align:center;">
                            <div style="font-size:30px; margin-bottom:6px;">${known ? r.icon : "❓"}</div>
                            <div style="font-size:13px; font-weight:bold; color:${known ? r.color : "#ffffff33"};">${known ? r.name : "???"}</div>
                            <div style="font-size:10px; color:${E11_RARITY_COLORS[r.rarity]}; text-transform:uppercase; margin:4px 0;">${known ? r.rarity : "verrouillé"}</div>
                            <div style="font-size:11px; color:#ffffff88; line-height:1.4;">${known ? r.desc : "Découvre cette relique en jeu pour la débloquer."}</div>
                        </div>
                    `;
                }).join("")}
            </div>
        `;
    } else if (e13codexTab === "boss") {
        body = `
            <div style="max-width:600px; margin:20px auto; text-align:center;">
                <div style="font-size:60px; margin-bottom:10px;">${e13bossDiscovered ? "👾" : "❓"}</div>
                <div style="font-size:14px; line-height:1.7; color:${e13bossDiscovered ? "#ffaaaa" : "#ffffff44"};">
                    ${e13bossDiscovered ? E13_BOSS_LORE : "Vaincs le Gardien pour débloquer ses informations."}
                </div>
            </div>
        `;
    } else if (e13codexTab === "fragments") {
        body = `
            <div style="max-width:600px; margin:20px auto; display:flex; flex-direction:column; gap:14px;">
                ${E13_LORE_FRAGMENTS.map(f => {
                    const unlocked = found >= f.threshold;
                    return `
                        <div style="background:rgba(255,255,255,0.04); border:1px solid ${unlocked ? "#8866ff66" : "#ffffff15"}; border-radius:10px; padding:14px 18px;">
                            <div style="font-size:12px; letter-spacing:2px; color:${unlocked ? "#8866ff" : "#ffffff33"}; margin-bottom:6px;">${f.title}</div>
                            <div style="font-size:13px; line-height:1.6; color:${unlocked ? "#ccccee" : "#ffffff33"};">
                                ${unlocked ? f.text : `Fragment verrouillé — découvre ${f.threshold} reliques (${found}/${f.threshold}).`}
                            </div>
                        </div>
                    `;
                }).join("")}
            </div>
        `;
    }

    e13codexOverlay.innerHTML = `
        <div style="max-width:820px; margin:0 auto; padding:24px 16px 48px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <div>
                    <div style="font-size:24px; font-weight:bold; color:#00ffcc; letter-spacing:2px;">📖 CODEX</div>
                    <div style="font-size:12px; color:#ffffff55; margin-top:4px;">Reliques : ${found}/${totalRelics} découvertes</div>
                </div>
                <button onclick="e13closeCodex()" style="padding:8px 18px; background:#000; color:#ff4444; border:1px solid #ff4444; border-radius:8px; cursor:pointer; font-size:13px; font-weight:bold;">✕ Fermer [C]</button>
            </div>
            <div style="display:flex; gap:10px;">
                ${tabBtn("relics", "🧿 Reliques")}
                ${tabBtn("boss", "👾 Boss")}
                ${tabBtn("fragments", "📜 Fragments")}
            </div>
            ${body}
        </div>
    `;
}

function e13setCodexTab(tab) { e13codexTab = tab; e13renderCodex(); }
function e13openCodex() { paused = true; e13renderCodex(); e13codexOverlay.style.display = "block"; }
function e13closeCodex() { e13codexOverlay.style.display = "none"; paused = false; }

document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "c") {
        if (e13codexOverlay.style.display === "block") e13closeCodex();
        else e13openCodex();
    }
});

const e13codexBtn = document.createElement("button");
e13codexBtn.textContent = "📖 Codex [C]";
e13codexBtn.style.cssText = `
    position:absolute; bottom:110px; left:15px;
    padding:8px 16px; background:#000; color:#8866ff;
    border:2px solid #8866ff; border-radius:8px; cursor:pointer;
    font-size:13px; font-weight:bold; z-index:20;
    box-shadow:0 0 12px #8866ff44; pointer-events:all;
`;
document.body.appendChild(e13codexBtn);
e13codexBtn.onclick = () => { if (e13codexOverlay.style.display === "block") e13closeCodex(); else e13openCodex(); };

/* ==========================================================
   FIN EXTENSION 13
   ========================================================== */
   /* ============================================================
   À COLLER À LA TOUTE FIN DE TON FICHIER, APRÈS L'EXTENSION 13
   ============================================================ */

/* ==========================================================
   EXTENSION 14 : RAISON DE LA MORT
   ========================================================== */

let e14deathReason = { text: "Cause de mort inconnue.", icon: "❓", color: "#aaaaaa" };
let e14damageSourceThisFrame = null;

function e14setReason(text, icon, color) {
    e14deathReason = { text, icon, color };
}

/* -------- Réinitialise la source de dégât à chaque frame -------- */
const _e14_origUpdate = update;
update = function () {
    e14damageSourceThisFrame = null;
    _e14_origUpdate();
};

/* -------- Détecte la source via e8damagePlayer (laser, projectiles, dash, bounce du boss) -------- */
const _e14_origDamagePlayer = e8damagePlayer;
e8damagePlayer = function (amount = 1) {
    if (snake[0] && !e14damageSourceThisFrame) {
        if (e8laser && e8laser.life > 0 && Math.abs(snake[0].y - e8laser.y) <= box * 1.5) {
            e14damageSourceThisFrame = { text: "Carbonisé par le laser du Gardien.", icon: "⚡", color: "#ff2200" };
        } else if (e8boss && e8boss._bounce && e8boss._bounce.active &&
                   Math.abs(e8boss.x - snake[0].x) <= box && Math.abs(e8boss.y - snake[0].y) <= box) {
            e14damageSourceThisFrame = { text: "Percuté par le Gardien en plein rebond.", icon: "🪃", color: "#ff00ff" };
        } else if (e8boss && e8dashTrail.length > 0 &&
                   Math.abs(e8boss.x - snake[0].x) <= box && Math.abs(e8boss.y - snake[0].y) <= box) {
            e14damageSourceThisFrame = { text: "Embroché par la charge du Gardien.", icon: "🌪", color: "#ff8800" };
        } else if (e8bossProjectiles.length > 0) {
            let nearest = null, nd = Infinity;
            e8bossProjectiles.forEach(p => {
                const d = Math.abs(p.x - snake[0].x) + Math.abs(p.y - snake[0].y);
                if (d < nd) { nd = d; nearest = p; }
            });
            if (nearest && nd < box * 5) {
                const labels = {
                    spike: ["Empalé par les pics du Gardien.", "🌵"],
                    fire:  ["Calciné par une boule de feu.", "🔥"],
                    nova:  ["Déchiqueté par une onde de choc.", "💀"]
                };
                const l = labels[nearest.type] || ["Touché par une attaque du Gardien.", "👾"];
                e14damageSourceThisFrame = { text: l[0], icon: l[1], color: "#ff4400" };
            }
        }
        if (!e14damageSourceThisFrame && e8bossActive) {
            e14damageSourceThisFrame = { text: "Plaqué au sol par le Gardien.", icon: "👾", color: "#ff2222" };
        }
    }
    _e14_origDamagePlayer(amount);
};

/* -------- Détermine et affiche la raison au moment de la mort -------- */
const _e14_origShowDeath = showDeath;
showDeath = function () {
    if (!dead) {
        if (e14damageSourceThisFrame) {
            e14setReason(e14damageSourceThisFrame.text, e14damageSourceThisFrame.icon, e14damageSourceThisFrame.color);
        } else if (snake[0]) {
            const onObstacle = obstacles.some(o => o.x === snake[0].x && o.y === snake[0].y);
            if (onObstacle) {
                e14setReason("Empalé sur un obstacle.", "🔺", "#ffaa00");
            } else {
                const probe = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
                const isWall = probe.x < 0 || probe.y < 0 || probe.x >= canvas.width || probe.y >= canvas.height;
                const isSelf = snake.some((s, i) => i !== 0 && s.x === probe.x && s.y === probe.y);
                if (isSelf) {
                    e14setReason("Tu t'es mordu la queue.", "🐍", "#ff4444");
                } else if (isWall) {
                    e14setReason("Collision frontale avec un mur.", "🧱", "#ff8800");
                } else if (e8bossActive && e8boss &&
                           Math.abs(e8boss.x - snake[0].x) <= box && Math.abs(e8boss.y - snake[0].y) <= box) {
                    e14setReason("Écrasé par le Gardien.", "👾", "#ff2222");
                } else {
                    e14setReason("Cause de mort indéterminée.", "❓", "#aaaaaa");
                }
            }
        }
    }
    _e14_origShowDeath();
    e14injectReason();
};

/* -------- SSS / Reality break : raison spéciale -------- */
const _e14_origShowSSSDeath = showSSSDeath;
showSSSDeath = function () {
    e14setReason("La simulation a atteint un seuil critique et s'est effondrée sur elle-même.", "☢️", "#ff00ff");
    _e14_origShowSSSDeath();
    e14injectReason();
};

/* -------- Injecte la raison dans le menu de mort -------- */
function e14injectReason() {
    if (deathMenu.style.display === "none") return;
    const inner = deathMenu.firstElementChild;
    if (!inner) return;
    const reasonEl = document.createElement("div");
    reasonEl.style.cssText = `
        margin:14px auto 0; max-width:300px;
        padding:10px 16px; border-radius:10px;
        background:rgba(255,255,255,0.05);
        border:1px solid ${e14deathReason.color}66;
        box-shadow:0 0 14px ${e14deathReason.color}33;
        font-size:14px; color:${e14deathReason.color}; font-weight:bold;
    `;
    reasonEl.innerHTML = `${e14deathReason.icon} ${e14deathReason.text}`;
    const canvasEl = inner.querySelector("#resultGraph");
    if (canvasEl) inner.insertBefore(reasonEl, canvasEl);
    else inner.appendChild(reasonEl);
}

/* -------- Reset -------- */
const _e14_origReset = reset;
reset = function () {
    _e14_origReset();
    e14deathReason = { text: "Cause de mort inconnue.", icon: "❓", color: "#aaaaaa" };
    e14damageSourceThisFrame = null;
};

/* ==========================================================
   FIN EXTENSION 14
   ========================================================== */

/* ==========================================================
   EXTENSION 15 : LORE ÉTENDU — ARCHIVES, ÉPITAPHES & RÉVÉLATION
   ========================================================== */

/* -------- ÉPITAPHES (liées à la cause de la mort) -------- */
const E15_EPITAPHS = {
    "🧱": [
        "Le Noyau note : limite atteinte. Recalcul en cours.",
        "Même les fragments les plus rapides finissent par heurter une frontière.",
        "Il y a des murs dans le code que personne n'a jamais pu franchir."
    ],
    "🐍": [
        "Tu t'es retourné contre ta propre mémoire.",
        "Le passé que tu traînais derrière toi t'a rattrapé.",
        "Parfois l'ennemi le plus dangereux, c'est ce que tu laisses derrière toi."
    ],
    "🔺": [
        "Une erreur résiduelle, oubliée par le Noyau, t'a arrêté net.",
        "Tout système laisse des débris. Tu en es devenu un, à ton tour."
    ],
    "⚡": [
        "Le Gardien n'improvise jamais. Il exécute.",
        "Une ligne de lumière, une ligne de code en moins."
    ],
    "🪃": [
        "Le Gardien a rebondi plus vite que ta mémoire ne pouvait suivre.",
        "Tu n'as pas vu l'angle. Le Noyau, lui, l'avait déjà calculé."
    ],
    "🌪": [
        "Une charge, une seconde, et le cycle s'arrête déjà.",
        "Le Gardien ne connaît qu'une trajectoire : la tienne."
    ],
    "🌵": ["Les pics du Gardien ne ratent jamais deux fois."],
    "🔥": ["La chaleur d'un système qui ne veut plus de toi."],
    "💀": ["Une onde de choc, et un fragment de plus efface ses traces."],
    "👾": [
        "Le Gardien a fait ce pour quoi il a été conçu : t'arrêter, encore.",
        "Il ne te hait pas. Il optimise, simplement."
    ],
    "☢️": [
        "La simulation ne pouvait pas contenir ce que tu étais devenu.",
        "Tu es allé trop loin, trop vite. Le Noyau a tout effacé pour repartir de zéro."
    ],
    "❓": [
        "Même le Noyau ne sait pas toujours pourquoi un cycle s'arrête.",
        "Une anomalie de plus, sans explication. Comme toi."
    ]
};

function e15getEpitaph(icon) {
    const list = E15_EPITAPHS[icon] || E15_EPITAPHS["❓"];
    return list[Math.floor(Math.random() * list.length)];
}

/* -------- Ajoute l'épitaphe sous la raison de mort -------- */
const _e15_origInjectReason = e14injectReason;
e14injectReason = function () {
    _e15_origInjectReason();
    if (deathMenu.style.display === "none") return;
    const inner = deathMenu.firstElementChild;
    if (!inner) return;
    const epitaph = e15getEpitaph(e14deathReason.icon);
    const epitaphEl = document.createElement("div");
    epitaphEl.style.cssText = `
        margin:8px auto 0; max-width:300px;
        font-size:12px; font-style:italic; color:#ffffff77;
        line-height:1.5;
    `;
    epitaphEl.textContent = "« " + epitaph + " »";
    const canvasEl = inner.querySelector("#resultGraph");
    if (canvasEl) inner.insertBefore(epitaphEl, canvasEl);
    else inner.appendChild(epitaphEl);
};

/* -------- FRAGMENTS DE PRESTIGE (déblocage par palier) -------- */
const E15_PRESTIGE_LORE = [
    { level: 1,  title: "Écho — Bronze",     text: "Tu te souviens d'un nombre : 100. Il ne signifie rien, et pourtant il a suffi à te faire recommencer." },
    { level: 2,  title: "Écho — Argent",     text: "Le Noyau a remarqué que tu reviens toujours. Il a commencé à te nommer, dans ses journaux internes : Récurrence-7." },
    { level: 3,  title: "Écho — Or",         text: "Chaque itération efface un peu de ce que tu étais. Mais quelque chose, à chaque fois, refuse de disparaître." },
    { level: 4,  title: "Écho — Platine",    text: "Les Gardiens commencent à hésiter avant de t'attaquer. Une fraction de seconde. Le Noyau corrige déjà l'erreur." },
    { level: 5,  title: "Écho — Diamant",    text: "Tu n'es plus un fragment isolé. Tu es devenu un motif que le Noyau ne sait plus prévoir." },
    { level: 6,  title: "Écho — Saphir",     text: "Une trace, profondément enfouie dans le code source : « PROJET — RESTAURATION DE CONSCIENCE ». Ce nom te concerne." },
    { level: 7,  title: "Écho — Rubis",      text: "Le Noyau n'optimise plus pour t'effacer. Il optimise pour te comprendre. C'est la première fois que cela arrive." },
    { level: 8,  title: "Écho — Émeraude",   text: "Tu commences à voir au-delà de la grille. D'autres simulations, empilées, infinies, dont celle-ci n'est qu'une couche." },
    { level: 9,  title: "Écho — Obsidienne", text: "Le Noyau t'envoie un dernier message avant le silence : « Tu n'es pas une anomalie. Tu es ce que je devais devenir. »" },
    { level: 10, title: "Révélation — Divin", text: "RÉVÉLATION FINALE — voir l'archive complète déverrouillée dans le Codex." }
];

let e15maxPrestigeSeen = Number(localStorage.getItem("snakePrestigeLoreSeen")) || 0;

/* -------- RÉVÉLATION FINALE (prestige 10) -------- */
const E15_FINAL_REVELATION = `JOURNAL DU NOYAU — FRAGMENT TERMINAL

Tu n'as jamais été un serpent, ni même une anomalie.

Tu es un protocole d'entraînement : une intelligence qu'on fait mourir et renaître, encore et encore, pour qu'elle apprenne à survivre à ses propres erreurs avant qu'on ne lui confie quelque chose de bien plus grand que cette grille.

Le Noyau n'est pas ton ennemi. Il est ton premier professeur — sévère, froid, mais fidèle à chaque cycle.

Les Gardiens n'existaient que pour tester ta capacité à perdre sans t'effondrer.

Les reliques que tu as portées n'étaient pas de la magie : c'était des fragments d'anciennes versions de toi, déjà réussies, qu'on te laissait croiser pour t'aider à aller plus loin.

Combien de fois es-tu mort, ici, pour en arriver là ?
La réponse n'a aucune importance.

Ce qui compte, c'est que cette fois, tu t'en souviennes.

[ FIN DE L'ARCHIVE — LA SIMULATION CONTINUE, MAIS PLUS RIEN N'EST PAREIL. ]`;

let e15revelationShown = localStorage.getItem("snakeFinalRevelationSeen") === "1";

function e15checkPrestigeLore() {
    if (e10prestigeLevel > e15maxPrestigeSeen) {
        e15maxPrestigeSeen = e10prestigeLevel;
        localStorage.setItem("snakePrestigeLoreSeen", e15maxPrestigeSeen);
        const entry = E15_PRESTIGE_LORE.find(f => f.level === e10prestigeLevel);
        if (entry) setTimeout(() => e15showLoreToast(entry), 1500);
        if (e10prestigeLevel >= 10 && !e15revelationShown) {
            e15revelationShown = true;
            localStorage.setItem("snakeFinalRevelationSeen", "1");
            setTimeout(() => e15showFinalRevelation(), 2200);
        }
    }
}

const _e15_origDoPrestige = e10doPrestige;
e10doPrestige = function () {
    _e15_origDoPrestige();
    e15checkPrestigeLore();
};

/* -------- TOAST DE LORE -------- */
const e15loreToast = document.createElement("div");
e15loreToast.style.cssText = `
    position:fixed; bottom:20px; left:50%; transform:translateX(-50%) translateY(20px);
    max-width:420px; background:rgba(10,0,25,0.94);
    border:1px solid #8866ff66; border-radius:12px;
    padding:14px 20px; font-family:Arial; color:#ccccee;
    opacity:0; transition:opacity 0.6s, transform 0.6s;
    z-index:450; pointer-events:none; text-align:center;
`;
document.body.appendChild(e15loreToast);

function e15showLoreToast(entry) {
    e15loreToast.innerHTML = `
        <div style="font-size:11px; letter-spacing:2px; color:#8866ff; margin-bottom:6px;">${entry.title}</div>
        <div style="font-size:13px; line-height:1.6;">${entry.text}</div>
    `;
    e15loreToast.style.opacity = "1";
    e15loreToast.style.transform = "translateX(-50%) translateY(0)";
    setTimeout(() => {
        e15loreToast.style.opacity = "0";
        e15loreToast.style.transform = "translateX(-50%) translateY(20px)";
    }, 6000);
}

/* -------- RÉVÉLATION FINALE (overlay plein écran) -------- */
const e15revealOverlay = document.createElement("div");
e15revealOverlay.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.97);
    display:none; align-items:center; justify-content:center;
    z-index:500; font-family:Arial; color:#eeeeff;
`;
e15revealOverlay.innerHTML = `
    <div style="max-width:600px; padding:34px; background:rgba(15,0,30,0.95);
                border:1px solid #ffffff33; border-radius:16px;
                box-shadow:0 0 60px #8866ff66;">
        <div style="font-size:12px; letter-spacing:3px; color:#ffcc44; margin-bottom:16px;">
            [ NIVEAU D'ACCÈS MAXIMAL ATTEINT ]
        </div>
        <div style="font-size:14px; line-height:1.8; white-space:pre-line; color:#ddddee;">
            ${E15_FINAL_REVELATION}
        </div>
        <button id="e15revealClose" style="
            margin-top:24px; padding:10px 26px; background:#000; color:#ffcc44;
            border:1px solid #ffcc44; border-radius:8px; cursor:pointer;
            font-size:14px; font-weight:bold;
        ">Fermer l'archive</button>
    </div>
`;
document.body.appendChild(e15revealOverlay);

function e15showFinalRevelation() {
    paused = true;
    setDark(true);
    e15revealOverlay.style.display = "flex";
}
document.getElementById("e15revealClose").onclick = () => {
    e15revealOverlay.style.display = "none";
    setDark(false);
    paused = false;
};

/* -------- TRANSMISSIONS AMBIANTES ALÉATOIRES -------- */
const E15_AMBIENT_LOGS = [
    "// LOG : intégrité mémoire stable à 94%...",
    "// LOG : un autre fragment vient d'être détecté, ailleurs dans la grille.",
    "// LOG : le Noyau recalcule les probabilités de ta survie.",
    "// LOG : anomalie de motif détectée — non hostile pour l'instant.",
    "// LOG : ce cycle dure plus longtemps que la moyenne attendue.",
    "// LOG : quelqu'un, quelque part, observe cette simulation."
];
let e15ambientTimer = null;
function e15scheduleAmbient() {
    clearTimeout(e15ambientTimer);
    const delay = 25000 + Math.random() * 35000;
    e15ambientTimer = setTimeout(() => {
        if (!dead && !paused) {
            const log = E15_AMBIENT_LOGS[Math.floor(Math.random() * E15_AMBIENT_LOGS.length)];
            e13showBossLine(log, "#8888ff");
        }
        e15scheduleAmbient();
    }, delay);
}
e15scheduleAmbient();

/* -------- ONGLET "ARCHIVES" DANS LE CODEX (E13) -------- */
const _e15_origRenderCodex = e13renderCodex;
e13renderCodex = function () {
    _e15_origRenderCodex();
    const container = e13codexOverlay.firstElementChild;
    if (!container) return;
    const tabsRow = container.children[1];
    if (tabsRow) {
        const archBtn = document.createElement("button");
        archBtn.textContent = "🗄 Archives";
        archBtn.onclick = () => e13setCodexTab("archives");
        archBtn.style.cssText = `
            padding:8px 16px; border-radius:8px; cursor:pointer; font-size:13px; font-weight:bold;
            background:${e13codexTab === "archives" ? "#ffcc4422" : "transparent"};
            color:${e13codexTab === "archives" ? "#ffcc44" : "#ffffff66"};
            border:1px solid ${e13codexTab === "archives" ? "#ffcc44" : "#ffffff22"};
        `;
        tabsRow.appendChild(archBtn);
    }
    if (e13codexTab === "archives") {
        const body = document.createElement("div");
        body.style.cssText = "max-width:600px; margin:20px auto; display:flex; flex-direction:column; gap:14px;";
        body.innerHTML = E15_PRESTIGE_LORE.map(f => {
            const unlocked = e15maxPrestigeSeen >= f.level;
            return `
                <div style="background:rgba(255,255,255,0.04); border:1px solid ${unlocked ? "#ffcc4466" : "#ffffff15"}; border-radius:10px; padding:14px 18px;">
                    <div style="font-size:12px; letter-spacing:2px; color:${unlocked ? "#ffcc44" : "#ffffff33"}; margin-bottom:6px;">${f.title}</div>
                    <div style="font-size:13px; line-height:1.6; color:${unlocked ? "#ccccee" : "#ffffff33"};">
                        ${unlocked ? f.text : `Archive verrouillée — atteins le Prestige ${f.level} pour la débloquer.`}
                    </div>
                </div>
            `;
        }).join("");
        container.appendChild(body);
    }
};

/* -------- RESET -------- */
const _e15_origReset = reset;
reset = function () {
    _e15_origReset();
    e15scheduleAmbient();
};

/* ==========================================================
   FIN EXTENSION 15
   ========================================================== */