# Hörprüfung Audio (B-30b)

Vorproduzierte MP3s für **Englisch** (Piper, Stimme `en_US-ljspeech-high`, seit B-64) **Französisch** (Kokoro, Stimme `ff_siwis`) und **Japanisch** (VOICEVOX, Stimme 冥鳴ひまり, seit B-67; vorgelesen wird die Kana-Lesung).

Jede Datei einmal anhören – am bequemsten auf der Abhörseite im Dev-Server:
`npm run dev`, dann http://localhost:5173/mimi_mots/tools/hoerpruefung.html

Abhaken (`[x]`), wenn die Aussprache passt. Klingt etwas falsch, in der Spalte „neu“ notieren, was nicht stimmt. Abhilfe: eine eigene Aufnahme als `audio-overrides/<en|fr|ja>/<id>.mp3` ablegen und `npm run audio` ausführen. (Einfach neu erzeugen hilft nicht – Kokoro, Piper und VOICEVOX liefern für denselben Text immer dieselbe Datei.)

| id | Deutsch | Englisch | ok | Französisch | ok | Japanisch | ok | neu |
|---|---|---|---|---|---|---|---|---|
| apfel | 🍎 Apfel | apple | [x] | la pomme | [x] | りんご | [ ] |  |
| banane | 🍌 Banane | banana | [ ] | la banane | [x] | バナナ | [ ] | Englisch klingt komisch |
| erdbeere | 🍓 Erdbeere | strawberry | [x] | la fraise | [x] | いちご | [ ] | Englisch ist ggf. falch |
| birne | 🍐 Birne | pear | [ ] | la poire | [x] | 梨（なし） | [ ] |  |
| kirsche | 🍒 Kirsche | cherry | [x] | la cerise | [x] | さくらんぼ | [ ] |  |
| zitrone | 🍋 Zitrone | lemon | [ ] | le citron | [x] | レモン | [ ] | Englisch fehlt l |
| karotte | 🥕 Karotte | carrot | [x] | la carotte | [x] | にんじん | [ ] |  |
| brot | 🍞 Brot | bread | [ ] | le pain | [x] | パン | [ ] |  |
| kaese | 🧀 Käse | cheese | [x] | le fromage | [x] | チーズ | [ ] |  |
| ei | 🥚 Ei | egg | [ ] | l'œuf | [ ] | 卵（たまご） | [ ] |  |
| milch | 🥛 Milch | milk | [ ] | le lait | [ ] | 牛乳（ぎゅうにゅう） | [ ] |  |
| kuchen | 🍰 Kuchen | cake | [ ] | le gâteau | [x] | ケーキ | [ ] |  |
| eis | 🍦 Eis | ice cream | [x] | la glace | [x] | アイス | [ ] |  |
| katze | 🐱 Katze | cat | [ ] | le chat | [x] | 猫（ねこ） | [ ] |  |
| hund | 🐶 Hund | dog | [ ] | le chien | [x] | 犬（いぬ） | [ ] |  |
| pferd | 🐴 Pferd | horse | [x] | le cheval | [x] | 馬（うま） | [ ] |  |
| maus | 🐭 Maus | mouse | [ ] | la souris | [x] | ねずみ | [ ] |  |
| hase | 🐰 Hase | rabbit | [x] | le lapin | [ ] | うさぎ | [ ] |  |
| vogel | 🐦 Vogel | bird | [ ] | l'oiseau | [x] | 鳥（とり） | [ ] |  |
| fisch | 🐟 Fisch | fish | [ ] | le poisson | [x] | 魚（さかな） | [ ] |  |
| kuh | 🐮 Kuh | cow | [ ] | la vache | [x] | 牛（うし） | [ ] |  |
| schwein | 🐷 Schwein | pig | [ ] | le cochon | [x] | 豚（ぶた） | [ ] |  |
| ente | 🦆 Ente | duck | [x] | le canard | [x] | カモ | [ ] |  |
| baer | 🐻 Bär | bear | [ ] | l'ours | [ ] | 熊（くま） | [ ] |  |
| loewe | 🦁 Löwe | lion | [x] | le lion | [ ] | ライオン | [ ] |  |
| elefant | 🐘 Elefant | elephant | [x] | l'éléphant | [x] | 象（ぞう） | [ ] |  |
| schmetterling | 🦋 Schmetterling | butterfly | [x] | le papillon | [x] | ちょうちょ | [ ] |  |
| frosch | 🐸 Frosch | frog | [ ] | la grenouille | [x] | かえる | [ ] |  |
| ball | ⚽ Ball | ball | [ ] | le ballon | [ ] | ボール | [ ] |  |
| haus | 🏠 Haus | house | [ ] | la maison | [x] | 家（いえ） | [ ] |  |
| auto | 🚗 Auto | car | [ ] | la voiture | [x] | 車（くるま） | [ ] |  |
| buch | 📖 Buch | book | [ ] | le livre | [x] | 本（ほん） | [ ] |  |
| baum | 🌳 Baum | tree | [ ] | l'arbre | [x] | 木（き） | [ ] |  |
| blume | 🌸 Blume | flower | [x] | la fleur | [x] | 花（はな） | [ ] |  |
| sonne | ☀️ Sonne | sun | [x] | le soleil | [x] | 太陽（たいよう） | [ ] |  |
| mond | 🌙 Mond | moon | [ ] | la lune | [ ] | 月（つき） | [ ] |  |
| stern | ⭐ Stern | star | [ ] | l'étoile | [x] | 星（ほし） | [ ] |  |
| schuh | 👟 Schuh | shoe | [x] | la chaussure | [x] | 靴（くつ） | [ ] |  |
| hut | 👒 Hut | hat | [ ] | le chapeau | [x] | 帽子（ぼうし） | [ ] |  |
| fahrrad | 🚲 Fahrrad | bike | [ ] | le vélo | [ ] | 自転車（じてんしゃ） | [ ] |  |
| boot | ⛵ Boot | boat | [ ] | le bateau | [x] | 船（ふね） | [ ] |  |
| zug | 🚂 Zug | train | [ ] | le train | [x] | 電車（でんしゃ） | [ ] |  |
| regenschirm | ☂️ Regenschirm | umbrella | [ ] | le parapluie | [ ] | 傘（かさ） | [ ] |  |
| herz | ❤️ Herz | heart | [x] | le cœur | [x] | ハート | [ ] |  |
| rot | 🔴 rot | red | [ ] | rouge | [ ] | 赤（あか） | [ ] |  |
| blau | 🔵 blau | blue | [ ] | bleu | [ ] | 青（あお） | [ ] |  |
| gelb | 🟡 gelb | yellow | [ ] | jaune | [x] | 黄色（きいろ） | [ ] |  |
| gruen | 🟢 grün | green | [ ] | vert | [ ] | 緑（みどり） | [ ] |  |
| lila | 🟣 lila | purple | [x] | violet | [ ] | 紫（むらさき） | [ ] |  |
| orange | 🟠 orange | orange | [x] | orange | [x] | オレンジ | [ ] |  |
| null | 0️⃣ null | zero | [x] | zéro | [x] | ゼロ | [ ] |  |
| eins | 1️⃣ eins | one | [ ] | un | [ ] | 一（いち） | [ ] |  |
| zwei | 2️⃣ zwei | two | [x] | deux | [ ] | 二（に） | [ ] |  |
| drei | 3️⃣ drei | three | [x] | trois | [ ] | 三（さん） | [ ] |  |
| vier | 4️⃣ vier | four | [ ] | quatre | [x] | 四（よん） | [ ] |  |
| fuenf | 5️⃣ fünf | five | [x] | cinq | [x] | 五（ご） | [ ] |  |
| sechs | 6️⃣ sechs | six | [x] | six | [ ] | 六（ろく） | [ ] |  |
| sieben | 7️⃣ sieben | seven | [x] | sept | [x] | 七（なな） | [ ] |  |
| acht | 8️⃣ acht | eight | [ ] | huit | [ ] | 八（はち） | [ ] |  |
| neun | 9️⃣ neun | nine | [ ] | neuf | [ ] | 九（きゅう） | [ ] |  |
| zehn | 🔟 zehn | ten | [x] | dix | [ ] | 十（じゅう） | [ ] |  |
