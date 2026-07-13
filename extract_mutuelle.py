#!/usr/bin/env python3
"""Extrait les informations d'une carte de mutuelle (image) via l'API Claude
et les enregistre dans un fichier Excel."""

import argparse
import base64
import json
import mimetypes
import os
import sys
from pathlib import Path

import anthropic
import pandas as pd

# Claude 3.5 Sonnet est un modèle retiré (28/10/2025). On utilise le modèle
# Sonnet actuel, Claude Sonnet 5.
MODEL = "claude-sonnet-5"

COLUMNS = [
    "Nom de la mutuelle",
    "Nom du réseau",
    "Numéro adhérent",
    "Numéro de sécurité sociale",
    "Date de naissance de l'assuré",
    "Date de validité de la mutuelle",
]

PROMPT = """Voici une photo ou un scan d'une carte de mutuelle (assurance santé complémentaire française).

Extrais STRICTEMENT et UNIQUEMENT les 6 informations suivantes visibles sur la carte :
- nom_mutuelle : le nom de la mutuelle (organisme assureur)
- nom_reseau : le nom du réseau de soins s'il est indiqué (par exemple Kalixia, Santéclair, Itelis, Carte Blanche...). Si aucun réseau n'est mentionné, indique exactement "Aucun".
- numero_adherent : le numéro d'adhérent
- numero_secu : le numéro de sécurité sociale de l'assuré
- date_naissance : la date de naissance de l'assuré
- date_validite : la date de validité de la mutuelle

Si une information n'est pas visible ou lisible sur l'image, mets la valeur "Non trouvé" pour ce champ."""

# Contrainte de schéma JSON : l'API garantit que le premier bloc de la réponse
# est un texte JSON valide conforme à ce schéma (pas de texte parasite à retirer).
OUTPUT_SCHEMA = {
    "type": "json_schema",
    "schema": {
        "type": "object",
        "properties": {
            "nom_mutuelle": {"type": "string"},
            "nom_reseau": {"type": "string"},
            "numero_adherent": {"type": "string"},
            "numero_secu": {"type": "string"},
            "date_naissance": {"type": "string"},
            "date_validite": {"type": "string"},
        },
        "required": [
            "nom_mutuelle",
            "nom_reseau",
            "numero_adherent",
            "numero_secu",
            "date_naissance",
            "date_validite",
        ],
        "additionalProperties": False,
    },
}

SUPPORTED_MEDIA_TYPES = {"image/jpeg", "image/png"}


def encode_image(image_path: Path) -> tuple[str, str]:
    media_type, _ = mimetypes.guess_type(image_path.name)
    if media_type not in SUPPORTED_MEDIA_TYPES:
        sys.exit(
            f"Erreur : format d'image non supporté ({media_type}). "
            "Utilisez un fichier JPG ou PNG."
        )
    data = base64.standard_b64encode(image_path.read_bytes()).decode("utf-8")
    return media_type, data


def extract_info(image_path: Path) -> dict:
    if not os.environ.get("ANTHROPIC_API_KEY"):
        sys.exit(
            "Erreur d'authentification : définissez la variable d'environnement "
            "ANTHROPIC_API_KEY avec votre clé API Anthropic."
        )

    client = anthropic.Anthropic()  # lit ANTHROPIC_API_KEY dans l'environnement
    media_type, image_data = encode_image(image_path)

    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            output_config={"format": OUTPUT_SCHEMA},
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_data,
                            },
                        },
                        {"type": "text", "text": PROMPT},
                    ],
                }
            ],
        )
    except anthropic.AuthenticationError:
        sys.exit(
            "Erreur d'authentification : définissez la variable d'environnement "
            "ANTHROPIC_API_KEY avec votre clé API Anthropic."
        )
    except anthropic.APIStatusError as exc:
        sys.exit(f"Erreur API Anthropic ({exc.status_code}) : {exc.message}")

    if response.stop_reason == "refusal":
        sys.exit("Erreur : la demande a été refusée par les filtres de sécurité de l'API.")

    text = next(block.text for block in response.content if block.type == "text")
    return json.loads(text)


def save_to_excel(data: dict, output_path: Path) -> None:
    row = {
        "Nom de la mutuelle": data.get("nom_mutuelle", ""),
        "Nom du réseau": data.get("nom_reseau", ""),
        "Numéro adhérent": data.get("numero_adherent", ""),
        "Numéro de sécurité sociale": data.get("numero_secu", ""),
        "Date de naissance de l'assuré": data.get("date_naissance", ""),
        "Date de validité de la mutuelle": data.get("date_validite", ""),
    }

    if output_path.exists():
        existing = pd.read_excel(output_path)
        df = pd.concat([existing, pd.DataFrame([row])], ignore_index=True)
    else:
        df = pd.DataFrame([row], columns=COLUMNS)

    df.to_excel(output_path, index=False)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Extrait les informations d'une carte de mutuelle via l'IA et les enregistre dans un fichier Excel."
    )
    parser.add_argument("image", help="Chemin de l'image de la carte de mutuelle (JPG ou PNG)")
    parser.add_argument(
        "-o", "--output", default="mutuelles.xlsx",
        help="Chemin du fichier Excel de sortie (par défaut : mutuelles.xlsx)",
    )
    args = parser.parse_args()

    image_path = Path(args.image)
    if not image_path.is_file():
        sys.exit(f"Erreur : le fichier '{image_path}' n'existe pas.")

    output_path = Path(args.output)

    print(f"Analyse de l'image {image_path}...")
    data = extract_info(image_path)
    print("Informations extraites :")
    print(json.dumps(data, indent=2, ensure_ascii=False))

    save_to_excel(data, output_path)
    print(f"Ligne ajoutée dans {output_path}")


if __name__ == "__main__":
    main()
