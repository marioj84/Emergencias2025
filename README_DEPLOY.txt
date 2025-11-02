INSTRUCCIONES RÁPIDAS PARA DEPLOY EN GITHUB PAGES

Archivos generados:
- index.html
- questions.json

Opciones:
A) Subir al repositorio propio y activar GitHub Pages (recomendado)
1. Crea un repo nuevo en GitHub (ej. quiz-tac).
2. Sube los archivos index.html y questions.json al root del repo (Upload files).
3. Ve a Settings > Pages > Branch: main (o gh-pages) y carpeta: root. Guarda.
4. Espera unos minutos y abre: https://<tu-usuario>.github.io/<repo>/

B) Probar localmente (rápido)
1. Abre una terminal en la carpeta donde estén los archivos.
2. Ejecuta: python -m http.server 8000
3. Abre en tu navegador: http://localhost:8000

NOTAS:
- El sistema incluye un MODO EDICIÓN para marcar/guardar las respuestas correctas (localStorage).
- Puedes importar un JSON con respuestas (formato: {"answers": {"1":0, "2":2}}) o usar el panel de edición y luego exportar las respuestas.
- Si quieres que yo genere el archivo `tac_answers.json` con la clave, súbeme esa clave (CSV o JSON con pares id→correctIndex) y lo incorporo automáticamente al questions.json.

Si quieres que haga el push directo a un repo público, dame el nombre de usuario y el repo (si ya lo creaste) y te doy los comandos exactos para ejecutar en tu máquina. Si prefieres que lo haga yo, necesitaría acceso a tu cuenta (no puedo).