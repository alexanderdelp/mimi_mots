# Hörprüfung Audio (B-30b)

Vorproduzierte MP3s für **Englisch** (Piper, Stimme `en_US-ljspeech-high`, seit B-64) **Französisch** (Kokoro, Stimme `ff_siwis`) und **Japanisch** (VOICEVOX, Stimme 冥鳴ひまり, seit B-67; vorgelesen wird die Kana-Lesung).

Jede Datei einmal anhören – am bequemsten auf der Abhörseite im Dev-Server:
`npm run dev`, dann http://localhost:5173/mimi_mots/tools/hoerpruefung.html

Abhaken (`[x]`), wenn die Aussprache passt. Klingt etwas falsch, in der Spalte „neu“ notieren, was nicht stimmt. Abhilfe: eine eigene Aufnahme als `audio-overrides/<en|fr|ja>/<id>.mp3` ablegen und `npm run audio` ausführen. (Einfach neu erzeugen hilft nicht – Kokoro, Piper und VOICEVOX liefern für denselben Text immer dieselbe Datei.)

| id | Deutsch | Englisch | ok | Französisch | ok | Japanisch | ok | neu |
|---|---|---|---|---|---|---|---|---|
| apfel | 🍎 Apfel | apple | [ ] | la pomme | [ ] | りんご | [ ] |  |
| banane | 🍌 Banane | banana | [ ] | la banane | [ ] | バナナ | [ ] |  |
| erdbeere | 🍓 Erdbeere | strawberry | [ ] | la fraise | [ ] | いちご | [ ] |  |
| birne | 🍐 Birne | pear | [ ] | la poire | [ ] | 梨（なし） | [ ] |  |
| kirsche | 🍒 Kirsche | cherry | [ ] | la cerise | [ ] | さくらんぼ | [ ] |  |
| zitrone | 🍋 Zitrone | lemon | [ ] | le citron | [ ] | レモン | [ ] |  |
| karotte | 🥕 Karotte | carrot | [ ] | la carotte | [ ] | にんじん | [ ] |  |
| brot | 🍞 Brot | bread | [ ] | le pain | [ ] | パン | [ ] |  |
| kaese | 🧀 Käse | cheese | [ ] | le fromage | [ ] | チーズ | [ ] |  |
| ei | 🥚 Ei | egg | [ ] | l'œuf | [ ] | 卵（たまご） | [ ] |  |
| milch | 🥛 Milch | milk | [ ] | le lait | [ ] | 牛乳（ぎゅうにゅう） | [ ] |  |
| kuchen | 🍰 Kuchen | cake | [ ] | le gâteau | [ ] | ケーキ | [ ] |  |
| eis | 🍦 Eis | ice cream | [ ] | la glace | [ ] | アイス | [ ] |  |
| katze | 🐱 Katze | cat | [ ] | le chat | [ ] | 猫（ねこ） | [ ] |  |
| hund | 🐶 Hund | dog | [ ] | le chien | [ ] | 犬（いぬ） | [ ] |  |
| pferd | 🐴 Pferd | horse | [ ] | le cheval | [ ] | 馬（うま） | [ ] |  |
| maus | 🐭 Maus | mouse | [ ] | la souris | [ ] | ねずみ | [ ] |  |
| hase | 🐰 Hase | rabbit | [ ] | le lapin | [ ] | うさぎ | [ ] |  |
| vogel | 🐦 Vogel | bird | [ ] | l'oiseau | [ ] | 鳥（とり） | [ ] |  |
| fisch | 🐟 Fisch | fish | [ ] | le poisson | [ ] | 魚（さかな） | [ ] |  |
| kuh | 🐮 Kuh | cow | [ ] | la vache | [ ] | 牛（うし） | [ ] |  |
| schwein | 🐷 Schwein | pig | [ ] | le cochon | [ ] | 豚（ぶた） | [ ] |  |
| ente | 🦆 Ente | duck | [ ] | le canard | [ ] | カモ | [ ] |  |
| baer | 🐻 Bär | bear | [ ] | l'ours | [ ] | 熊（くま） | [ ] |  |
| loewe | 🦁 Löwe | lion | [ ] | le lion | [ ] | ライオン | [ ] |  |
| elefant | 🐘 Elefant | elephant | [ ] | l'éléphant | [ ] | 象（ぞう） | [ ] |  |
| schmetterling | 🦋 Schmetterling | butterfly | [ ] | le papillon | [ ] | ちょうちょ | [ ] |  |
| frosch | 🐸 Frosch | frog | [ ] | la grenouille | [ ] | かえる | [ ] |  |
| ball | ⚽ Ball | ball | [ ] | le ballon | [ ] | ボール | [ ] |  |
| haus | 🏠 Haus | house | [ ] | la maison | [ ] | 家（いえ） | [ ] |  |
| auto | 🚗 Auto | car | [ ] | la voiture | [ ] | 車（くるま） | [ ] |  |
| buch | 📖 Buch | book | [ ] | le livre | [ ] | 本（ほん） | [ ] |  |
| baum | 🌳 Baum | tree | [ ] | l'arbre | [ ] | 木（き） | [ ] |  |
| blume | 🌸 Blume | flower | [ ] | la fleur | [ ] | 花（はな） | [ ] |  |
| sonne | ☀️ Sonne | sun | [ ] | le soleil | [ ] | 太陽（たいよう） | [ ] |  |
| mond | 🌙 Mond | moon | [ ] | la lune | [ ] | 月（つき） | [ ] |  |
| stern | ⭐ Stern | star | [ ] | l'étoile | [ ] | 星（ほし） | [ ] |  |
| schuh | 👟 Schuh | shoe | [ ] | la chaussure | [ ] | 靴（くつ） | [ ] |  |
| hut | 👒 Hut | hat | [ ] | le chapeau | [ ] | 帽子（ぼうし） | [ ] |  |
| fahrrad | 🚲 Fahrrad | bike | [ ] | le vélo | [ ] | 自転車（じてんしゃ） | [ ] |  |
| boot | ⛵ Boot | boat | [ ] | le bateau | [ ] | 船（ふね） | [ ] |  |
| zug | 🚂 Zug | train | [ ] | le train | [ ] | 電車（でんしゃ） | [ ] |  |
| regenschirm | ☂️ Regenschirm | umbrella | [ ] | le parapluie | [ ] | 傘（かさ） | [ ] |  |
| herz | ❤️ Herz | heart | [ ] | le cœur | [ ] | ハート | [ ] |  |
| rot | 🔴 rot | red | [ ] | rouge | [ ] | 赤（あか） | [ ] |  |
| blau | 🔵 blau | blue | [ ] | bleu | [ ] | 青（あお） | [ ] |  |
| gelb | 🟡 gelb | yellow | [ ] | jaune | [ ] | 黄色（きいろ） | [ ] |  |
| gruen | 🟢 grün | green | [ ] | vert | [ ] | 緑（みどり） | [ ] |  |
| lila | 🟣 lila | purple | [ ] | violet | [ ] | 紫（むらさき） | [ ] |  |
| orange | 🟠 orange | orange | [ ] | orange | [ ] | オレンジ | [ ] |  |
