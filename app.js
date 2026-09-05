const cfg = window.APP_CONFIG;

const { createClient } = supabase;

const client = createClient(
  cfg.SUPABASE_URL,
  cfg.SUPABASE_ANON_KEY
);

const postsEl = document.getElementById("posts");
const archiveEl = document.getElementById("archive");
const sortSelect = document.getElementById("sortSelect");
const emptyEl = document.getElementById("emptyState");

let allPosts = [];
let selectedMonth = null;


/* =========================================================
   FUNÇÕES BÁSICAS
========================================================= */

function escapeHtml(s = "") {
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));
}


function fmtDate(d) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short"
  }).format(new Date(d));
}


function monthKey(d) {
  const x = new Date(d);

  return `${x.getFullYear()}-${String(
    x.getMonth() + 1
  ).padStart(2, "0")}`;
}


function monthLabel(key) {
  const [y, m] = key.split("-");

  return `${new Intl.DateTimeFormat("pt-BR", {
    month: "long"
  }).format(new Date(+y, +m - 1, 1)).toUpperCase()} - ${y}`;
}


function safeUrl(url) {
  try {
    const u = new URL(url);

    return ["http:", "https:"].includes(u.protocol)
      ? u.href
      : "#";
  } catch {
    return "#";
  }
}


/* =========================================================
   SISTEMA DE ESTRELAS E MARCAS
========================================================= */

/*
  Marcas que podem ser alcançadas pelas estrelas.
*/

const STAR_MILESTONES = [
  1000,
  5000,
  10000,
  25000,
  50000,
  100000,
  250000,
  500000,
  1000000,
  2500000,
  5000000,
  10000000
];


/*
  Formata números grandes de maneira bonita.
  
  Exemplos:
  842       → 842
  1000      → 1K
  8742      → 8.7K
  10000     → 10K
  250000    → 250K
  1000000   → 1M
*/

function formatStars(number) {
  number = Number(number) || 0;

  if (number < 1000) {
    return number.toLocaleString("pt-BR");
  }

  if (number < 1000000) {
    const value = number / 1000;

    if (Number.isInteger(value)) {
      return `${value}K`;
    }

    return `${value.toFixed(1).replace(".", ",")}K`;
  }

  if (number < 1000000000) {
    const value = number / 1000000;

    if (Number.isInteger(value)) {
      return `${value}M`;
    }

    return `${value.toFixed(1).replace(".", ",")}M`;
  }

  const value = number / 1000000000;

  if (Number.isInteger(value)) {
    return `${value}B`;
  }

  return `${value.toFixed(1).replace(".", ",")}B`;
}


/*
  Descobre qual é a próxima marca.
*/

function getNextMilestone(stars) {
  stars = Number(stars) || 0;

  return STAR_MILESTONES.find(
    milestone => stars < milestone
  ) || null;
}


/*
  Descobre a última marca já alcançada.
*/

function getLastMilestone(stars) {
  stars = Number(stars) || 0;

  let last = 0;

  for (const milestone of STAR_MILESTONES) {
    if (stars >= milestone) {
      last = milestone;
    } else {
      break;
    }
  }

  return last;
}


/*
  Cria a mensagem abaixo da contagem.
*/

function getMilestoneText(stars) {
  stars = Number(stars) || 0;

  const next = getNextMilestone(stars);
  const last = getLastMilestone(stars);

  /*
    Se acabou de ultrapassar todas as marcas disponíveis.
  */

  if (!next) {
    return `
      <div class="star-milestone reached">
        ✨ Todas as grandes marcas foram alcançadas!
      </div>
    `;
  }


  /*
    Se uma marca acabou de ser alcançada.
  */

  if (last > 0 && stars === last) {
    return `
      <div class="star-milestone reached">
        ✨ MARCA DE ${formatStars(last)} ALCANÇADA!
      </div>

      <div class="star-next">
        🎯 Próxima marca: ${formatStars(next)}
      </div>
    `;
  }


  /*
    Progresso até a próxima marca.
  */

  const previous = last;

  const range = next - previous;

  const progress = Math.min(
    100,
    Math.max(
      0,
      ((stars - previous) / range) * 100
    )
  );

  return `
    <div class="star-next">
      🎯 Próxima marca: <strong>${formatStars(next)}</strong>
    </div>

    <div class="star-progress">
      <div
        class="star-progress-bar"
        style="width:${progress}%"
      ></div>
    </div>
  `;
}


/*
  Cria as estrelinhas que sobem pela tela.
*/

function createFlyingStars(button) {

  const rect = button.getBoundingClientRect();

  for (let i = 0; i < 3; i++) {

    const star = document.createElement("span");

    star.className = "star-fly";

    star.textContent = "✦";

    star.style.left =
      (
        rect.left +
        Math.random() * rect.width
      ) + "px";

    star.style.top =
      rect.top + "px";

    star.style.setProperty(
      "--x",
      (Math.random() * 120 - 60) + "px"
    );

    document.body.appendChild(star);

    setTimeout(() => {
      star.remove();
    }, 1200);
  }
}


/* =========================================================
   ARQUIVO POR MÊS
========================================================= */

function renderArchive() {

  const groups = {};

  allPosts.forEach(post => {

    const key = monthKey(post.published_at);

    if (!groups[key]) {
      groups[key] = [];
    }

    groups[key].push(post);
  });


  const keys = Object.keys(groups).sort(
    (a, b) => b.localeCompare(a)
  );


  archiveEl.innerHTML = `
    <button
      class="archive-btn ${selectedMonth === null ? "active" : ""}"
      data-month=""
    >
      TODOS

      <span class="archive-count">
        ${allPosts.length}
      </span>
    </button>

    ${
      keys.map(key => `
        <button
          class="archive-btn ${selectedMonth === key ? "active" : ""}"
          data-month="${key}"
        >
          ${monthLabel(key)}

          <span class="archive-count">
            ${groups[key].length}
          </span>
        </button>
      `).join("")
    }
  `;


  archiveEl
    .querySelectorAll("[data-month]")
    .forEach(button => {

      button.onclick = () => {

        selectedMonth =
          button.dataset.month || null;

        renderArchive();

        renderPosts();
      };

    });


  /*
    Versão para celular.
  */

  const mobileArchive =
    document.getElementById("monthMobile");

  if (mobileArchive) {

    mobileArchive.innerHTML =
      archiveEl.innerHTML;

    mobileArchive
      .querySelectorAll("[data-month]")
      .forEach(button => {

        button.onclick = () => {

          selectedMonth =
            button.dataset.month || null;

          renderArchive();

          renderPosts();
        };

      });
  }
}


/* =========================================================
   POSTS
========================================================= */

function renderPosts() {

  let arr = allPosts.filter(post => {

    return (
      !selectedMonth ||
      monthKey(post.published_at) === selectedMonth
    );

  });


  const sort = sortSelect.value;


  /*
    Mais antigos
  */

  if (sort === "oldest") {

    arr.sort(
      (a, b) =>
        new Date(a.published_at) -
        new Date(b.published_at)
    );

  }


  /*
    Mais relevantes
  */

  else if (sort === "stars") {

    arr.sort(
      (a, b) =>
        Number(b.stars) -
        Number(a.stars) ||
        new Date(b.published_at) -
        new Date(a.published_at)
    );

  }


  /*
    Mais recentes
  */

  else {

    arr.sort(
      (a, b) =>
        new Date(b.published_at) -
        new Date(a.published_at)
    );

  }


  emptyEl.classList.toggle(
    "hidden",
    arr.length !== 0
  );


  postsEl.innerHTML = arr.map((post, index) => {

    const stars = Number(post.stars) || 0;

    return `
      <article
        class="post"
        data-post-id="${post.id}"
      >

        <div class="post-date">
          ${fmtDate(post.published_at)}
        </div>


        ${
          post.title
            ? `
              <h2 class="post-title">
                ${escapeHtml(post.title)}
              </h2>
            `
            : ""
        }


        ${
          post.body
            ? `
              <div class="post-body">
                ${escapeHtml(post.body)}
              </div>
            `
            : ""
        }


        ${
          post.image_url
            ? `
              <img
                class="post-media"
                loading="lazy"
                src="${safeUrl(post.image_url)}"
                alt=""
              >
            `
            : ""
        }


        ${
          post.video_url
            ? `
              <video
                class="post-media"
                controls
                preload="metadata"
                src="${safeUrl(post.video_url)}"
              ></video>
            `
            : ""
        }


        ${
          post.link_url
            ? `
              <a
                class="post-link"
                target="_blank"
                rel="noopener"
                href="${safeUrl(post.link_url)}"
              >
                abrir link ↗
              </a>
            `
            : ""
        }


        <div class="post-footer">

          <button
            class="star-btn"
            data-star="${post.id}"
            aria-label="Enviar uma estrela"
          >
            ✦

            <span class="star-number">
              ${formatStars(stars)}
            </span>
          </button>


          <span class="star-total-label">
            ${stars === 1 ? "estrela enviada" : "estrelas enviadas"}
          </span>

        </div>


        <div
          class="star-milestone-area"
          data-milestone="${post.id}"
        >
          ${getMilestoneText(stars)}
        </div>

      </article>
    `;

  }).join("");


  /*
    Ativa os botões.
  */

  postsEl
    .querySelectorAll("[data-star]")
    .forEach(button => {

      button.onclick = () => {

        starPost(
          button.dataset.star,
          button
        );

      };

    });
}


/* =========================================================
   ENVIAR ESTRELA
========================================================= */

async function starPost(id, button) {

  /*
    Desabilitamos somente durante esta requisição.
    Isso evita duplo clique acidental enquanto o servidor
    ainda está respondendo.
  */

  button.disabled = true;


  const {
    data,
    error
  } = await client.rpc(
    "add_star",
    {
      p_post_id: id
    }
  );


  if (error) {

    console.error(
      "Erro ao enviar estrela:",
      error
    );

    button.disabled = false;

    return;
  }


  /*
    O Supabase devolve a nova quantidade.
  */

  const newCount =
    Number(data) || 0;


  /*
    Atualiza o post localmente.
  */

  const post =
    allPosts.find(
      item => item.id === id
    );


  if (post) {
    post.stars = newCount;
  }


  /*
    Atualiza o número mostrado.
  */

  const numberElement =
    button.querySelector(
      ".star-number"
    );


  if (numberElement) {

    numberElement.textContent =
      formatStars(newCount);

  }


  /*
    Atualiza "estrela enviada" /
    "estrelas enviadas".
  */

  const postElement =
    button.closest(".post");


  const label =
    postElement.querySelector(
      ".star-total-label"
    );


  if (label) {

    label.textContent =
      newCount === 1
        ? "estrela enviada"
        : "estrelas enviadas";

  }


  /*
    Atualiza a próxima marca.
  */

  const milestoneArea =
    postElement.querySelector(
      "[data-milestone]"
    );


  if (milestoneArea) {

    milestoneArea.innerHTML =
      getMilestoneText(newCount);

  }


  /*
    Animação das estrelas.
  */

  createFlyingStars(button);


  /*
    Pequena animação no contador.
  */

  if (numberElement) {

    numberElement.animate(
      [
        {
          transform: "scale(1)"
        },
        {
          transform: "scale(1.25)"
        },
        {
          transform: "scale(1)"
        }
      ],
      {
        duration: 250,
        easing: "ease-out"
      }
    );

  }


  /*
    Libera o botão imediatamente depois da atualização.
  */

  button.disabled = false;
}


/* =========================================================
   CARREGAR POSTS
========================================================= */

async function loadPosts() {

  const {
    data,
    error
  } = await client
    .from("posts")
    .select(
      "id,title,body,image_url,video_url,link_url,published_at,stars,show_stars"
    )
    .lte(
      "published_at",
      new Date().toISOString()
    )
    .order(
      "published_at",
      {
        ascending: false
      }
    );


  if (error) {

    postsEl.innerHTML = `
      <p class="form-message">
        Não foi possível carregar as postagens.
        Verifique a configuração do Supabase.
      </p>
    `;

    console.error(error);

    return;
  }


  allPosts = data || [];

  renderArchive();

  renderPosts();
}


/* =========================================================
   ORDENAÇÃO
========================================================= */

sortSelect.onchange = renderPosts;


/* =========================================================
   MODAIS
========================================================= */

function openModal(id) {

  document
    .getElementById(id)
    .classList
    .remove("hidden");
}


function closeModal(id) {

  document
    .getElementById(id)
    .classList
    .add("hidden");
}


document
  .querySelectorAll("[data-close]")
  .forEach(button => {

    button.onclick = () => {

      closeModal(
        button.dataset.close
      );

    };

  });


document.getElementById(
  "settingsBtn"
).onclick = () => {

  openModal("settingsModal");

};


document.getElementById(
  "settingsFooterBtn"
).onclick = () => {

  openModal("settingsModal");

};


/*
  Botão João Arthur
*/

document.getElementById(
  "ownerBtn"
).onclick = () => {

  location.href = "admin.html";

};


/* =========================================================
   CONFIGURAÇÕES
========================================================= */

const range =
  document.getElementById("fontRange");

const desktop =
  document.getElementById("desktopMode");


range.value =
  localStorage.getItem("jam_font") ||
  "100";


document.documentElement.style.fontSize =
  range.value + "%";


range.oninput = () => {

  document.documentElement.style.fontSize =
    range.value + "%";

  localStorage.setItem(
    "jam_font",
    range.value
  );

};


desktop.checked =
  localStorage.getItem("jam_desktop") === "1";


desktop.onchange = () => {

  document.body.classList.toggle(
    "desktop-forced",
    desktop.checked
  );

  localStorage.setItem(
    "jam_desktop",
    desktop.checked
      ? "1"
      : "0"
  );

};


document.body.classList.toggle(
  "desktop-forced",
  desktop.checked
);


/* =========================================================
   LOGIN DO JOÃO
========================================================= */

document.getElementById(
  "loginForm"
).onsubmit = async e => {

  e.preventDefault();


  const message =
    document.getElementById(
      "loginMessage"
    );


  message.textContent =
    "Entrando...";


  const {
    data,
    error
  } = await client.auth.signInWithPassword({

    email:
      document.getElementById(
        "loginEmail"
      ).value,

    password:
      document.getElementById(
        "loginPassword"
      ).value

  });


  if (error) {

    message.textContent =
      "Não foi possível entrar. Confira e-mail e senha.";

    return;
  }


  if (!data.user) {

    message.textContent =
      "Login não concluído.";

    return;
  }


  location.href =
    "admin.html";
};


/* =========================================================
   RECUPERAÇÃO DE SENHA
========================================================= */

document.getElementById(
  "forgotPasswordBtn"
).onclick = async () => {

  const email =
    document.getElementById(
      "loginEmail"
    ).value;


  const message =
    document.getElementById(
      "loginMessage"
    );


  if (!email) {

    message.textContent =
      "Digite seu e-mail primeiro.";

    return;
  }


  const {
    error
  } = await client.auth.resetPasswordForEmail(
    email,
    {
      redirectTo:
        cfg.SITE_URL +
        "reset.html"
    }
  );


  if (error) {

    message.textContent =
      "Não foi possível enviar o e-mail.";

    return;
  }


  message.textContent =
    "Se esse e-mail existir, o link de recuperação foi enviado.";
};


/* =========================================================
   TELA DE CARREGAMENTO
========================================================= */

function loading() {

  const screen =
    document.getElementById(
      "loadingScreen"
    );


  const target =
    "João Arthur";


  const box =
    document.getElementById(
      "writingName"
    );


  /*
    Cria as estrelas da tela inicial.
  */

  const count = 30;


  for (let i = 0; i < count; i++) {

    const star =
      document.createElement(
        "span"
      );


    star.className =
      "star";


    star.textContent =
      ["✦", "⋆", "✧"][i % 3];


    star.style.left =
      Math.random() * 100 + "%";


    star.style.top =
      Math.random() * 100 + "%";


    star.style.animationDelay =
      Math.random() * 3 + "s";


    star.style.fontSize =
      8 + Math.random() * 13 + "px";


    document
      .getElementById(
        "loadingStars"
      )
      .appendChild(star);
  }


  /*
    Escreve "João Arthur"
    durante 5 segundos.
  */

  let i = 0;


  const interval =
    setInterval(() => {

      box.textContent =
        target.slice(
          0,
          i++
        );


      if (i > target.length) {

        clearInterval(interval);

        screen.classList.add(
          "done"
        );

      }

    }, 5000 / target.length);


  /*
    A tela permanece durante
    8 segundos no total.
  */

  setTimeout(() => {

    screen.classList.add(
      "fade"
    );

  }, 8000);
}


/* =========================================================
   INICIAR SITE
========================================================= */

loading();

loadPosts();
