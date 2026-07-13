#!/usr/bin/env python3
"""Interface web locale pour extract_mutuelle.py.

Lance un petit serveur web permettant d'uploader une photo de carte de
mutuelle depuis le navigateur, de voir le résultat extrait par Claude,
et de télécharger le fichier Excel cumulatif.
"""

import io
import os
import tempfile
from pathlib import Path

from flask import Flask, render_template_string, request, send_file
import pandas as pd

from extract_mutuelle import COLUMNS, ExtractionError, extract_info, save_to_excel

OUTPUT_PATH = Path("mutuelles.xlsx")

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024  # 10 Mo

PAGE = """
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Extraction cartes de mutuelle</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, sans-serif; max-width: 780px; margin: 2rem auto; padding: 0 1rem; }
  h1 { font-size: 1.4rem; }
  .card { border: 1px solid #8884; border-radius: 10px; padding: 1.25rem; margin-bottom: 1.5rem; }
  .drop { border: 2px dashed #8888; border-radius: 10px; padding: 2rem; text-align: center; }
  input[type=file] { margin: 1rem 0; }
  button { background: #d64545; color: white; border: none; border-radius: 8px; padding: 0.6rem 1.2rem; font-size: 1rem; cursor: pointer; }
  button:hover { background: #b93838; }
  table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.9rem; }
  th, td { text-align: left; padding: 0.4rem 0.6rem; border-bottom: 1px solid #8883; }
  .error { background: #d6454522; border: 1px solid #d64545; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1rem; }
  .success { background: #2e9e5b22; border: 1px solid #2e9e5b; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1rem; }
  a.download { display: inline-block; margin-top: 0.75rem; }
</style>
</head>
<body>
  <h1>📇 Extraction de cartes de mutuelle</h1>
  <p>Uploadez une photo ou un scan (JPG/PNG) d'une carte de mutuelle. Claude en extrait 6 informations et les ajoute au fichier Excel.</p>

  {% if error %}
  <div class="error"><strong>Erreur :</strong> {{ error }}</div>
  {% endif %}

  {% if result %}
  <div class="success">
    <strong>Informations extraites :</strong>
    <table>
      {% for label, value in result.items() %}
      <tr><th>{{ label }}</th><td>{{ value }}</td></tr>
      {% endfor %}
    </table>
  </div>
  {% endif %}

  <div class="card">
    <form method="post" enctype="multipart/form-data">
      <div class="drop">
        <input type="file" name="image" accept="image/png, image/jpeg" required>
        <br>
        <button type="submit">Analyser la carte</button>
      </div>
    </form>
  </div>

  {% if has_output %}
  <div class="card">
    <strong>{{ row_count }} carte(s) enregistrée(s)</strong>
    <br>
    <a class="download" href="/download">⬇️ Télécharger le fichier Excel ({{ output_name }})</a>
  </div>
  {% endif %}
</body>
</html>
"""


def render(error=None, result=None):
    row_count = 0
    if OUTPUT_PATH.exists():
        row_count = len(pd.read_excel(OUTPUT_PATH))
    return render_template_string(
        PAGE,
        error=error,
        result=result,
        has_output=OUTPUT_PATH.exists(),
        row_count=row_count,
        output_name=OUTPUT_PATH.name,
    )


@app.route("/", methods=["GET"])
def index():
    return render()


@app.route("/", methods=["POST"])
def upload():
    file = request.files.get("image")
    if not file or file.filename == "":
        return render(error="Aucun fichier sélectionné."), 400

    suffix = Path(file.filename).suffix.lower()
    if suffix not in (".jpg", ".jpeg", ".png"):
        return render(error="Format non supporté : utilisez un fichier JPG ou PNG."), 400

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir) / f"upload{suffix}"
        file.save(tmp_path)
        try:
            data = extract_info(tmp_path)
        except ExtractionError as exc:
            return render(error=str(exc)), 502

    save_to_excel(data, OUTPUT_PATH)

    result = {
        COLUMNS[0]: data.get("nom_mutuelle", ""),
        COLUMNS[1]: data.get("nom_reseau", ""),
        COLUMNS[2]: data.get("numero_adherent", ""),
        COLUMNS[3]: data.get("numero_secu", ""),
        COLUMNS[4]: data.get("date_naissance", ""),
        COLUMNS[5]: data.get("date_validite", ""),
    }
    return render(result=result)


@app.route("/download")
def download():
    if not OUTPUT_PATH.exists():
        return "Aucun fichier à télécharger pour le moment.", 404
    buffer = io.BytesIO(OUTPUT_PATH.read_bytes())
    return send_file(
        buffer,
        as_attachment=True,
        download_name=OUTPUT_PATH.name,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


if __name__ == "__main__":
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print(
            "Attention : la variable ANTHROPIC_API_KEY n'est pas définie. "
            "L'extraction échouera tant qu'elle ne sera pas définie."
        )
    app.run(debug=True, host="127.0.0.1", port=5000)
