
  const RTDB_BASE = "https://fluentech-1e18a-default-rtdb.firebaseio.com";
 const RTDB_BASE_ALT = "https://fluentech-1e18a.firebaseio.com";

let botActive = true;
const seenElements = new Set();
let isSending = false;

console.log("%c[FluenCircle Bot] Monitorando sessões ativas do FluenCircle!", "background:#2bfd78;color:#000;font-size:14px;font-weight:bold;padding:4px 8px;border-radius:4px;");


function createStatusBadge() {
  if (document.getElementById("fluencircle-badge")) return;

  const btn = document.createElement("button");
  btn.id = "fluencircle-badge";

  if (!document.getElementById("fluencircle-font")) {
    const link = document.createElement("link");
    link.id = "fluencircle-font";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@500;700&display=swap";
    document.head.appendChild(link);
  }
  
  function updateStyle() {
    btn.textContent = botActive ? "🟢 FluenCircle Bot: on" : "🔴 FluenCircle Bot: off";
    btn.style.background = botActive ? "#06163b" : "#1e293b";
    btn.style.color = botActive ? "#51ff91" : "#94a3b8";
    btn.style.borderColor = botActive ? "#2bfd78" : "#475569";
  }

  btn.style.cssText = `
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    border: none;
    border-radius: 20px;
    padding: 6px 16px;
    font-size: 12px;
   
    font-family: system-ui, sans-serif;
    letter-spacing: 2px;
    cursor: pointer;
    z-index: 999999;
    box-shadow: 0 4px 15px rgba(0,0,0,0.6);
    transition: all 0.2s;;
    font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif
  `;

  updateStyle();

  btn.onclick = () => {
    botActive = !botActive;
    updateStyle();
    console.log(`[FluenCircle Bot] ${botActive ? "Ativado" : "Desativado"}`);
  };

  document.body.appendChild(btn);
}



async function fetchCurrentSession() {
  try {
    let res = await fetch(`${RTDB_BASE}/current_session.json`);
    if (!res.ok) {
      res = await fetch(`${RTDB_BASE_ALT}/current_session.json`);
    }
    const data = await res.json();
    return data; 
  } catch (e) {
    console.error("[Bot] Erro ao buscar current_session:", e);
    return null;
  }
}


 async function askGemini(prompt) {
const BACKEND_URL = 'https://fluencircle-backend.onrender.com';
  try {
    const response = await fetch(`${BACKEND_URL}/api/gemini/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt })
    });

    console.log(response)

    if (!response.ok) {
      throw new Error(`Erro no servidor: ${response.statusText}`);
    }
    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Erro ao chamar o backend:', error);
    throw error;
  }
}


async function saveFlashcard(sessionId, topic, word, translation) {
  const cardData = {
    front: word,
    back: translation,
    sessionId: sessionId,
    topic: topic || "Google Meet",
    createdAt: new Date().toISOString()
  };

  const endpointDefault = `${RTDB_BASE}/flashcards/${sessionId}.json`;
  const endpointAlt = `${RTDB_BASE_ALT}/flashcards/${sessionId}.json`;

  try {
    let res = await fetch(endpointDefault, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cardData)
    });

    if (!res.ok) {
      res = await fetch(endpointAlt, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cardData)
      });
    }

    if (res.ok) {
      const data = await res.json();
      console.log(`%c[Bot] ✅ Flashcard "${word}" salvo com sucesso na Sessão [${sessionId}]! (ID: ${data.name})`, "color:#2bfd78;font-weight:bold;");
    }
  } catch (e) {
    console.error("[Bot] Falha ao salvar flashcard:", e);
  }
}


async function sendToChat(msg) {
  if (isSending) return;
  isSending = true;

  try {
    const textarea = document.getElementById("bfTqV") || document.querySelector('textarea[jsname="YPqjbf"]');
    if (!textarea) return;

    textarea.focus();
    textarea.value = msg;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    await new Promise(r => setTimeout(r, 250));

    const btn = textarea.closest('div[jscontroller]')?.querySelector('button') || document.querySelector('button[aria-label*="Enviar"]');
    if (btn && !btn.disabled) {
      btn.click();
    }
  } finally {
    setTimeout(() => { isSending = false; }, 800);
  }
}


setTimeout(createStatusBadge, 1500);


setTimeout(() => {
  document.querySelectorAll('div').forEach(el => seenElements.add(el));
}, 2000);

setInterval(async () => {
  if (!botActive) return;

  const divs = document.querySelectorAll('div');

  for (const el of divs) {
    if (seenElements.has(el)) continue;

    if (el.children.length === 0 && el.tagName === 'DIV') {
      const text = (el.innerText || el.textContent || '').trim();

      const matchFc = text.match(/^fc:\s*(.+)$/i);
      const matchGem = text.match(/^askGem:\s*(.+)$/i)

      if (matchFc || matchGem) {
        seenElements.add(el);
        const word = matchFc?matchFc[1].trim():matchGem[1].trim();
        console.log(`%c[Bot] Comando capturado: "${word}"`, "background:#38bdf8;color:#000;padding:2px 8px;font-weight:bold;");
        const currentSession = await fetchCurrentSession();

        if (!currentSession || !currentSession.sessionId) {
          console.warn("[Bot] Nenhuma sessão ativa em /current_session!");
          await sendToChat("Inicie uma sessão na plataforma!");
          return;
        }

        const promptGem = `responda: ${word} da forma mais direta possível, sem pontuações denecessárias ou negrito, sabendo que vai para um chat do google meet. Caso seja uma pergunta inadequada ou não associada ao contexto de conversação em inglês, responda somente: "Faça uma pergunta sobre inglês!"`
        const promptTranslation = `retorne a tradução da palavra, de en para pt ou pt para en. Caso seja uma palavra única e que tenha múltiplas traduções, separe as traduções por /, com no máximo 3. Caso seja uma frase, nunca repita a frase inteira mais de uma vez, retorne uma tradução única que fizer mais sentido pelo contexto. Retorne SOMENTE as traduções, sem nenhuma adição. Ex: annoying, resposta: 'estressante / irritante' Palavra a ser traduzida: ${word}. `
        const answer = matchFc? await askGemini(promptTranslation) : await askGemini(promptGem);
        if (answer) {
          
          if(matchFc){
            await saveFlashcard(currentSession.sessionId, currentSession.topic, word, answer);
          await sendToChat(`[${word}]: ${answer}`);
          }else if(matchGem){
            await sendToChat(`[Gemini]: ${answer}`);
          }
          
        }
      }
    }
  }
}, 500);