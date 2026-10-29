# Hörprüfung Audio (B-30b)

Jede Datei einmal anhören – am bequemsten auf der Abhörseite im Dev-Server:
`npm run dev`, dann http://localhost:5173/mimi_mots/tools/hoerpruefung.html

Abhaken (`[x]`), wenn die Aussprache passt. Klingt etwas falsch, in der Spalte „neu“ notieren, was nicht stimmt. Abhilfe: Datei mit `npm run audio -- --id <id> --lang <en|fr> --force` neu erzeugen (anderer Zufall) oder eine eigene Aufnahme als `audio-overrides/<lang>/<id>.mp3` ablegen und `npm run audio` ausführen.

| id | Deutsch | Englisch | ok | neu | Französisch | ok | neu |
|---|---|---|---|---|---|---|---|
| apfel | 🍎 Apfel | apple | [ ] |  | la pomme | [ ] |  |
| banane | 🍌 Banane | banana | [ ] |  | la banane | [ ] |  |
| erdbeere | 🍓 Erdbeere | strawberry | [ ] |  | la fraise | [ ] |  |
| birne | 🍐 Birne | pear | [ ] |  | la poire | [ ] |  |
| kirsche | 🍒 Kirsche | cherry | [ ] |  | la cerise | [ ] |  |
| zitrone | 🍋 Zitrone | lemon | [ ] |  | le citron | [ ] |  |
| karotte | 🥕 Karotte | carrot | [ ] |  | la carotte | [ ] |  |
| brot | 🍞 Brot | bread | [ ] |  | le pain | [ ] |  |
| kaese | 🧀 Käse | cheese | [ ] |  | le fromage | [ ] |  |
| ei | 🥚 Ei | egg | [ ] |  | l'œuf | [ ] |  |
| milch | 🥛 Milch | milk | [ ] |  | le lait | [ ] |  |
| kuchen | 🍰 Kuchen | cake | [ ] |  | le gâteau | [ ] |  |
| eis | 🍦 Eis | ice cream | [ ] |  | la glace | [ ] |  |
| katze | 🐱 Katze | cat | [ ] |  | le chat | [ ] |  |
| hund | 🐶 Hund | dog | [ ] |  | le chien | [ ] |  |
| pferd | 🐴 Pferd | horse | [ ] |  | le cheval | [ ] |  |
| maus | 🐭 Maus | mouse | [ ] |  | la souris | [ ] |  |
| hase | 🐰 Hase | rabbit | [ ] |  | le lapin | [ ] |  |
| vogel | 🐦 Vogel | bird | [ ] |  | l'oiseau | [ ] |  |
| fisch | 🐟 Fisch | fish | [ ] |  | le poisson | [ ] |  |
| kuh | 🐮 Kuh | cow | [ ] |  | la vache | [ ] |  |
| schwein | 🐷 Schwein | pig | [ ] |  | le cochon | [ ] |  |
| ente | 🦆 Ente | duck | [ ] |  | le canard | [ ] |  |
| baer | 🐻 Bär | bear | [ ] |  | l'ours | [ ] |  |
| loewe | 🦁 Löwe | lion | [ ] |  | le lion | [ ] |  |
| elefant | 🐘 Elefant | elephant | [ ] |  | l'éléphant | [ ] |  |
| schmetterling | 🦋 Schmetterling | butterfly | [ ] |  | le papillon | [ ] |  |
| frosch | 🐸 Frosch | frog | [ ] |  | la grenouille | [ ] |  |
| ball | ⚽ Ball | ball | [ ] |  | le ballon | [ ] |  |
| haus | 🏠 Haus | house | [ ] |  | la maison | [ ] |  |
| auto | 🚗 Auto | car | [ ] |  | la voiture | [ ] |  |
| buch | 📖 Buch | book | [ ] |  | le livre | [ ] |  |
| baum | 🌳 Baum | tree | [ ] |  | l'arbre | [ ] |  |
| blume | 🌸 Blume | flower | [ ] |  | la fleur | [ ] |  |
| sonne | ☀️ Sonne | sun | [ ] |  | le soleil | [ ] |  |
| mond | 🌙 Mond | moon | [ ] |  | la lune | [ ] |  |
| stern | ⭐ Stern | star | [ ] |  | l'étoile | [ ] |  |
| schuh | 👟 Schuh | shoe | [ ] |  | la chaussure | [ ] |  |
| hut | 👒 Hut | hat | [ ] |  | le chapeau | [ ] |  |
| fahrrad | 🚲 Fahrrad | bike | [ ] |  | le vélo | [ ] |  |
| boot | ⛵ Boot | boat | [ ] |  | le bateau | [ ] |  |
| zug | 🚂 Zug | train | [ ] |  | le train | [ ] |  |
| regenschirm | ☂️ Regenschirm | umbrella | [ ] |  | le parapluie | [ ] |  |
| herz | ❤️ Herz | heart | [ ] |  | le cœur | [ ] |  |
| rot | 🔴 rot | red | [ ] |  | rouge | [ ] |  |
| blau | 🔵 blau | blue | [ ] |  | bleu | [ ] |  |
| gelb | 🟡 gelb | yellow | [ ] |  | jaune | [ ] |  |
| gruen | 🟢 grün | green | [ ] |  | vert | [ ] |  |
| lila | 🟣 lila | purple | [ ] |  | violet | [ ] |  |
| orange | 🟠 orange | orange | [ ] |  | orange | [ ] |  |
