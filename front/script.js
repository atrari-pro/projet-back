const LETTRES = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];
const URL_API = "http://192.168.1.186:3000"
let myUserName = "";
let suisJeConnecte = false;
let myScore = 0;
let nombreReponse = 0;

const socket = io.connect(URL_API);

socket.on("userdisconnect", () => {
  updateListUsers();
});

socket.on("userconnect", () => {
  if(suisJeConnecte) updateListUsers();
});

let btnSeConnecter = document.querySelector("#seconnecter");

btnSeConnecter.addEventListener("click", () => {
  let name = document.querySelector("#name").value;
  myUserName = name;
  let data = { "name": name, "socketId": socket.id };
  let headers = {
    "Content-Type": "application/json",
  }
  fetch(URL_API, {
    method: "POST",
    headers: headers,
    body:  JSON.stringify(data)
  })
  .then((dataRecuDuServeur) => {
    if (dataRecuDuServeur.status == 201) {
      suisJeConnecte = true;
      document.querySelector("#form-pseudo").style.display = "none";
      socket.emit("userconnect");
      let infoJoueur = `
        <div>Name: ${name}</div>
        <div id="scoreJoueur">Score: ${myScore}</div>
      `;
      document.querySelector("#infoJoueur").innerHTML = infoJoueur;
      fetch(URL_API)
      .then(res => res.json())
      .then(users => {
        if(myUserName !== "") {
          users = users.filter(user => user.name !== myUserName);
        }
        viensJouer(users);
      });
    } else {
      document.querySelector('#pseudo-existe-deja').style.display = "block";
    }
  });
})

function updateListUsers() {
  cacherMessage();
  let usersListElement = document.querySelector("#list-users");
  fetch(URL_API)
  .then(res => res.json())
  .then(users => {
    if(myUserName !== "") {
      users = users.filter(user => user.name !== myUserName);
    }
    utilisateursConnectes = users;
    users = users.filter(user => user.name !== user.socketId);
    if(users.length == 0) {
      document.querySelector("#message-si-liste-vide").style.display = "block";
    } else {
      let usersLis = users.map(user => `
        <li class="user-item">${user.name}, score: ${user.score}</li>
      `)
      usersListElement.innerHTML = usersLis.join("");
    }
  })
}

function cacherMessage() {
  document.querySelector("#pseudo-existe-deja").style.display = "none";
  document.querySelector("#message-si-liste-vide").style.display = "none";
}


function viensJouer(users) {
  let message = document.querySelector("#message-viens-jour");
  let userConnected = users.filter(user => user.isConnected === true)[0];
  if(userConnected?.isConnected && suisJeConnecte) { // ecarter undefined et null + verifier si isConnected existe + moi je suis connecte
    socket.emit("vient-jouer", {
      expediteur: socket.id,
      expediteurName: myUserName,
      recepteur: userConnected.socketId,
    });
    let compteur = 5;
    message.innerHTML = `La partie commence dans <span>${compteur}</span>s`;
    let intervalId = setInterval(() => {
      if(compteur == 1) clearInterval(intervalId);
      compteur--;
      message.innerHTML = `La partie commence dans <span>${compteur}</span>s`;
    }, 1000);
    setTimeout(() => {
      document.querySelector("#list-users").style.display = "none";
      document.querySelector("#attendreProposition").style.display = "block";
      message.innerHTML = "";
    }, 5000);
  }
}

socket.on("vient-jouer", (msg) => {
  let message = document.querySelector("#message-viens-jour");
  if(msg.expediteur !== socket.id && suisJeConnecte) {
    let compteur = 5;
    message.innerHTML = `${msg.expediteurName} vous invite a jouer. <br>
    la partie commence dans <span>${compteur}</span>s`;
    let intervalId = setInterval(() => {
      if(compteur == 1) clearInterval(intervalId);
      compteur--;
      message.innerHTML = `${msg.expediteurName} vous invite a jouer. <br>
      la partie commence dans <span>${compteur}</span>s`;
    }, 1000);
    setTimeout(() => {
      document.querySelector("#list-users").style.display = "none";
      document.querySelector("#form-pour-proposer").style.display = "block";
      let infoAdversaire = `
        <div>Name: ${msg.expediteurName}</div>
        <div id="scoreAdversaire">Score: 0</div>
      `;
      document.querySelector("#infoAdversaire").innerHTML = infoAdversaire;
      message.innerHTML = "";
    }, 5000);
  }
});

let btnEnvoyerLettreProposee = document.querySelector("#envoyerLettreProposee");

btnEnvoyerLettreProposee.addEventListener("click", () => {
  let lettreProposee = document.querySelector("#lettreProposee").value;
  socket.emit("proposer-lettre", {
    expediteur: socket.id,
    expediteurName: myUserName,
    score: myScore, 
    lettreProposee: lettreProposee
  });
  document.querySelector("#form-pour-proposer").style.display = "none";
  document.querySelector("#attendreReponse").style.display = "block";
});

socket.on("proposer-lettre", (msg) => {
  if(msg.expediteur !== socket.id) {
    let infoAdversaire = `
      <div>Name: ${msg.expediteurName}</div>
      <div id="scoreAdversaire">Score: ${msg.score}</div>
    `;
    document.querySelector("#infoAdversaire").innerHTML = infoAdversaire;
    document.querySelector("#attendreProposition").style.display = "none";
    document.querySelector("#form-pour-deviner").style.display = "block";
    document.querySelector("#lettreProposeeParAutre").innerHTML = msg.lettreProposee.toLowerCase();
  }
});

let btnEnvoyerNumeroPropose = document.querySelector("#envoyerNumeroPropose");

btnEnvoyerNumeroPropose.addEventListener("click", () => {
  nombreReponse++;
  let numeroPropose = document.querySelector("#numeroPropose").value;
  let lettreADeviner = document.querySelector("#lettreProposeeParAutre").innerText;
  let index = parseInt(numeroPropose) - 1;
  if(LETTRES[index] == lettreADeviner) {
    myScore++;
    document.querySelector("#scoreJoueur").innerHTML = `
      Score: ${myScore}
    `;
  }
  socket.emit("proposer-numero", {
    expediteur: socket.id,
    expediteurName: myUserName,
    score: myScore,
    nombreReponseAdversaire: nombreReponse
  });
  document.querySelector("#form-pour-deviner").style.display = "none";
  document.querySelector("#form-pour-proposer").style.display = "block";
});

socket.on("proposer-numero", (msg) => {
  if(msg.expediteur !== socket.id) {
    if(msg.nombreReponseAdversaire  > 0 && nombreReponse == msg.nombreReponseAdversaire) {
      if(msg.score > myScore) {
        socket.emit("afficher-resultat", {
          gagnant: msg.expediteur
        });
      } else if(msg.score < myScore) {
        socket.emit("afficher-resultat", {
          gagnant: socket.id
        });
      }
    }
    let infoAdversaire = `
      <div>Name: ${msg.expediteurName}</div>
      <div id="scoreAdversaire">Score: ${msg.score}</div>
    `;
    document.querySelector("#infoAdversaire").innerHTML = infoAdversaire;
    document.querySelector("#attendreProposition").style.display = "block";
    document.querySelector("#attendreReponse").style.display = "none";
  }
});

socket.on("afficher-resultat", (msg) => {
  document.querySelector("#attendreProposition").style.display = "none";
  document.querySelector("#form-pour-proposer").style.display = "none";
  if(msg.gagnant == socket.id) {
    document.querySelector("#messageGagner").style.display = "block";
  } else {
    document.querySelector("#messagePerdre").style.display = "block";
  }
});