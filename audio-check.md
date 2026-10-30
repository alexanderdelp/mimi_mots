# Hörprüfung Audio (B-30b)

Vorproduzierte MP3s für **Englisch** (Piper, Stimme `en_US-ljspeech-high`, seit B-64) **Französisch** (Kokoro, Stimme `ff_siwis`) und **Japanisch** (VOICEVOX, Stimme 冥鳴ひまり, seit B-67; vorgelesen wird die Kana-Lesung).

Jede Datei einmal anhören – am bequemsten auf der Abhörseite im Dev-Server:
`npm run dev`, dann http://localhost:5173/mimi_mots/tools/hoerpruefung.html

Abhaken (`[x]`), wenn die Aussprache passt. Klingt etwas falsch, in der Spalte „neu“ notieren, was nicht stimmt. Abhilfe: eine eigene Aufnahme als `audio-overrides/<en|fr|ja>/<id>.mp3` ablegen und `npm run audio` ausführen. (Einfach neu erzeugen hilft nicht – Kokoro, Piper und VOICEVOX liefern für denselben Text immer dieselbe Datei.)

| id | Deutsch | Englisch | ok | Französisch | ok | Japanisch | ok | neu |
|---|---|---|---|---|---|---|---|---|
| apfel | 🍎 Apfel | apple | [x] | la pomme | [ ] | りんご | [ ] |  |
| banane | 🍌 Banane | banana | [ ] | la banane | [ ] | バナナ | [ ] | Englisch klingt komisch |
| erdbeere | 🍓 Erdbeere | strawberry | [x] | la fraise | [ ] | いちご | [ ] | Englisch ist ggf. falch |
| birne | 🍐 Birne | pear | [ ] | la poire | [ ] | 梨（なし） | [ ] |  |
| kirsche | 🍒 Kirsche | cherry | [x] | la cerise | [ ] | さくらんぼ | [ ] |  |
| zitrone | 🍋 Zitrone | lemon | [ ] | le citron | [ ] | レモン | [ ] | Englisch fehlt l |
| karotte | 🥕 Karotte | carrot | [x] | la carotte | [ ] | にんじん | [ ] |  |
| brot | 🍞 Brot | bread | [ ] | le pain | [ ] | パン | [ ] |  |
| kaese | 🧀 Käse | cheese | [x] | le fromage | [ ] | チーズ | [ ] |  |
| ei | 🥚 Ei | egg | [ ] | l'œuf | [ ] | 卵（たまご） | [ ] |  |
| milch | 🥛 Milch | milk | [ ] | le lait | [ ] | 牛乳（ぎゅうにゅう） | [ ] |  |
| kuchen | 🍰 Kuchen | cake | [ ] | le gâteau | [ ] | ケーキ | [ ] |  |
| eis | 🍦 Eis | ice cream | [x] | la glace | [ ] | アイス | [ ] |  |
| katze | 🐱 Katze | cat | [ ] | le chat | [ ] | 猫（ねこ） | [ ] |  |
| hund | 🐶 Hund | dog | [ ] | le chien | [ ] | 犬（いぬ） | [ ] |  |
| pferd | 🐴 Pferd | horse | [x] | le cheval | [ ] | 馬（うま） | [ ] |  |
| maus | 🐭 Maus | mouse | [ ] | la souris | [ ] | ねずみ | [ ] |  |
| hase | 🐰 Hase | rabbit | [x] | le lapin | [ ] | うさぎ | [ ] |  |
| vogel | 🐦 Vogel | bird | [ ] | l'oiseau | [ ] | 鳥（とり） | [ ] |  |
| fisch | 🐟 Fisch | fish | [ ] | le poisson | [ ] | 魚（さかな） | [ ] |  |
| kuh | 🐮 Kuh | cow | [ ] | la vache | [ ] | 牛（うし） | [ ] |  |
| schwein | 🐷 Schwein | pig | [ ] | le cochon | [ ] | 豚（ぶた） | [ ] |  |
| ente | 🦆 Ente | duck | [x] | le canard | [ ] | カモ | [ ] |  |
| baer | 🐻 Bär | bear | [ ] | l'ours | [ ] | 熊（くま） | [ ] |  |
| loewe | 🦁 Löwe | lion | [x] | le lion | [ ] | ライオン | [ ] |  |
| elefant | 🐘 Elefant | elephant | [x] | l'éléphant | [ ] | 象（ぞう） | [ ] |  |
| schmetterling | 🦋 Schmetterling | butterfly | [x] | le papillon | [ ] | ちょうちょ | [ ] |  |
| frosch | 🐸 Frosch | frog | [ ] | la grenouille | [ ] | かえる | [ ] |  |
| ball | ⚽ Ball | ball | [ ] | le ballon | [ ] | ボール | [ ] |  |
| haus | 🏠 Haus | house | [ ] | la maison | [ ] | 家（いえ） | [ ] |  |
| auto | 🚗 Auto | car | [ ] | la voiture | [ ] | 車（くるま） | [ ] |  |
| buch | 📖 Buch | book | [ ] | le livre | [ ] | 本（ほん） | [ ] |  |
| baum | 🌳 Baum | tree | [ ] | l'arbre | [ ] | 木（き） | [ ] |  |
| blume | 🌸 Blume | flower | [x] | la fleur | [ ] | 花（はな） | [ ] |  |
| sonne | ☀️ Sonne | sun | [x] | le soleil | [ ] | 太陽（たいよう） | [ ] |  |
| mond | 🌙 Mond | moon | [ ] | la lune | [ ] | 月（つき） | [ ] |  |
| stern | ⭐ Stern | star | [ ] | l'étoile | [ ] | 星（ほし） | [ ] |  |
| schuh | 👟 Schuh | shoe | [x] | la chaussure | [ ] | 靴（くつ） | [ ] |  |
| hut | 👒 Hut | hat | [ ] | le chapeau | [ ] | 帽子（ぼうし） | [ ] |  |
| fahrrad | 🚲 Fahrrad | bike | [ ] | le vélo | [ ] | 自転車（じてんしゃ） | [ ] |  |
| boot | ⛵ Boot | boat | [ ] | le bateau | [ ] | 船（ふね） | [ ] |  |
| zug | 🚂 Zug | train | [ ] | le train | [ ] | 電車（でんしゃ） | [ ] |  |
| regenschirm | ☂️ Regenschirm | umbrella | [ ] | le parapluie | [ ] | 傘（かさ） | [ ] |  |
| herz | ❤️ Herz | heart | [x] | le cœur | [ ] | ハート | [ ] |  |
| rot | 🔴 rot | red | [ ] | rouge | [ ] | 赤（あか） | [ ] |  |
| blau | 🔵 blau | blue | [ ] | bleu | [ ] | 青（あお） | [ ] |  |
| gelb | 🟡 gelb | yellow | [ ] | jaune | [ ] | 黄色（きいろ） | [ ] |  |
| gruen | 🟢 grün | green | [ ] | vert | [ ] | 緑（みどり） | [ ] |  |
| lila | 🟣 lila | purple | [x] | violet | [ ] | 紫（むらさき） | [ ] |  |
| orange | 🟠 orange | orange | [x] | orange | [ ] | オレンジ | [ ] |  |
| null | 0️⃣ null | zero | [x] | zéro | [ ] | ゼロ | [ ] |  |
| eins | 1️⃣ eins | one | [ ] | un | [ ] | 一（いち） | [ ] |  |
| zwei | 2️⃣ zwei | two | [x] | deux | [ ] | 二（に） | [ ] |  |
| drei | 3️⃣ drei | three | [x] | trois | [ ] | 三（さん） | [ ] |  |
| vier | 4️⃣ vier | four | [ ] | quatre | [ ] | 四（よん） | [ ] |  |
| fuenf | 5️⃣ fünf | five | [x] | cinq | [ ] | 五（ご） | [ ] |  |
| sechs | 6️⃣ sechs | six | [x] | six | [ ] | 六（ろく） | [ ] |  |
| sieben | 7️⃣ sieben | seven | [x] | sept | [ ] | 七（なな） | [ ] |  |
| acht | 8️⃣ acht | eight | [ ] | huit | [ ] | 八（はち） | [ ] |  |
| neun | 9️⃣ neun | nine | [ ] | neuf | [ ] | 九（きゅう） | [ ] |  |
| zehn | 🔟 zehn | ten | [x] | dix | [ ] | 十（じゅう） | [ ] |  |
