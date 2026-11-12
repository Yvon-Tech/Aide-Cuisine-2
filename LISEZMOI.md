# Assistant Cuisine IA - V1

## Ce que tu dois ajouter
1. Ouvre le fichier `.env` (fichier caché, active l'affichage des fichiers cachés si besoin) :
   - `GEMINI_API_KEY` : ta clé API Gemini
   - `FEEDBACK_FORM_URL` : le lien de ton Google Forms
2. Place ton fichier audio dans `public/assets/` sous le nom exact `sonnerie.mp3`
   (sans lui, l'appli joue un simple bip).

## Lancer
```
npm install
npm start
```
Puis ouvre http://localhost:3000 (Node.js 18 ou plus requis).

## Notes
- La clé API reste côté serveur (`.env`), jamais dans le navigateur.
- Modèle utilisé : `gemini-3.6-flash` (modifiable avec `GEMINI_MODEL` dans `.env`).
- Ne partage jamais le fichier `.env`.

## Hors connexion (V1.1)
- Après une première visite en ligne, l'application se charge sans réseau (service worker `public/sw.js`).
- Chaque recette générée est gardée sur l'appareil (« Mes recettes », 12 maximum). Hors connexion, on peut l'ouvrir, la cuisiner étape par étape, utiliser les minuteurs et la liste de courses.
- Créer une nouvelle recette ou modifier une recette avec l'IA demande une connexion.
- La cuisson en cours (étape, minuteurs) est retrouvée même après fermeture de l'application.
- **Important :** le mode hors ligne ne fonctionne qu'en **HTTPS** (ou sur `localhost`). Sur un site en ligne, active HTTPS ; sur le Wi-Fi de la maison en `http://192.168...`, le navigateur le refuse.
- Notifications : le navigateur demande l'autorisation au premier minuteur. Sur iPhone, il faut d'abord ajouter l'application à l'écran d'accueil.
- Pour forcer une mise à jour chez tout le monde après une modification, change `VERSION` dans `public/sw.js`.
