# Hörprüfung Audio (B-30b)

Vorproduzierte MP3s gibt es nur für **Französisch** (Kokoro, Stimme `ff_siwis`). Englisch liest die App mit der Stimme des Geräts vor (siehe `anforderungen.md` §11).

Jede Datei einmal anhören – am bequemsten auf der Abhörseite im Dev-Server:
`npm run dev`, dann http://localhost:5173/mimi_mots/tools/hoerpruefung.html

Abhaken (`[x]`), wenn die Aussprache passt. Klingt etwas falsch, in der Spalte „neu“ notieren, was nicht stimmt. Abhilfe: eine eigene Aufnahme als `audio-overrides/fr/<id>.mp3` ablegen und `npm run audio` ausführen. (Einfach neu erzeugen hilft nicht – Kokoro liefert für denselben Text immer dieselbe Datei.)

| id | Deutsch | Französisch | ok | neu |
|---|---|---|---|---|
| apfel | 🍎 Apfel | la pomme | [ ] |  |
| banane | 🍌 Banane | la banane | [ ] |  |
| erdbeere | 🍓 Erdbeere | la fraise | [ ] |  |
| birne | 🍐 Birne | la poire | [ ] |  |
| kirsche | 🍒 Kirsche | la cerise | [ ] |  |
| zitrone | 🍋 Zitrone | le citron | [ ] |  |
| karotte | 🥕 Karotte | la carotte | [ ] |  |
| brot | 🍞 Brot | le pain | [ ] |  |
| kaese | 🧀 Käse | le fromage | [ ] |  |
| ei | 🥚 Ei | l'œuf | [ ] |  |
| milch | 🥛 Milch | le lait | [ ] |  |
| kuchen | 🍰 Kuchen | le gâteau | [ ] |  |
| eis | 🍦 Eis | la glace | [ ] |  |
| katze | 🐱 Katze | le chat | [ ] |  |
| hund | 🐶 Hund | le chien | [ ] |  |
| pferd | 🐴 Pferd | le cheval | [ ] |  |
| maus | 🐭 Maus | la souris | [ ] |  |
| hase | 🐰 Hase | le lapin | [ ] |  |
| vogel | 🐦 Vogel | l'oiseau | [ ] |  |
| fisch | 🐟 Fisch | le poisson | [ ] |  |
| kuh | 🐮 Kuh | la vache | [ ] |  |
| schwein | 🐷 Schwein | le cochon | [ ] |  |
| ente | 🦆 Ente | le canard | [ ] |  |
| baer | 🐻 Bär | l'ours | [ ] |  |
| loewe | 🦁 Löwe | le lion | [ ] |  |
| elefant | 🐘 Elefant | l'éléphant | [ ] |  |
| schmetterling | 🦋 Schmetterling | le papillon | [ ] |  |
| frosch | 🐸 Frosch | la grenouille | [ ] |  |
| ball | ⚽ Ball | le ballon | [ ] |  |
| haus | 🏠 Haus | la maison | [ ] |  |
| auto | 🚗 Auto | la voiture | [ ] |  |
| buch | 📖 Buch | le livre | [ ] |  |
| baum | 🌳 Baum | l'arbre | [ ] |  |
| blume | 🌸 Blume | la fleur | [ ] |  |
| sonne | ☀️ Sonne | le soleil | [ ] |  |
| mond | 🌙 Mond | la lune | [ ] |  |
| stern | ⭐ Stern | l'étoile | [ ] |  |
| schuh | 👟 Schuh | la chaussure | [ ] |  |
| hut | 👒 Hut | le chapeau | [ ] |  |
| fahrrad | 🚲 Fahrrad | le vélo | [ ] |  |
| boot | ⛵ Boot | le bateau | [ ] |  |
| zug | 🚂 Zug | le train | [ ] |  |
| regenschirm | ☂️ Regenschirm | le parapluie | [ ] |  |
| herz | ❤️ Herz | le cœur | [ ] |  |
| rot | 🔴 rot | rouge | [ ] |  |
| blau | 🔵 blau | bleu | [ ] |  |
| gelb | 🟡 gelb | jaune | [ ] |  |
| gruen | 🟢 grün | vert | [ ] |  |
| lila | 🟣 lila | violet | [ ] |  |
| orange | 🟠 orange | orange | [ ] |  |
