#!/usr/bin/env python3

import os
import sys
from pathlib import Path

IGNORED_DIRS = {
    ".git", ".idea", ".vscode", "target", "build", "node_modules",
    ".mvn", ".gradle", "__pycache__"
}

COMMON_LAYERS = [
    "controller",
    "service",
    "service/impl",
    "repository",
    "entity",
    "dto/request",
    "dto/response",
    "dto",
    "mapper",
    "security",
    "config",
    "exception",
    "validator",
    "util",
    "analysis",
    "analysis/impl",
    "model",
    "specification"
]

GLOBAL_ORDER = [
    "root",
    "pom",
    "main class",
    "resources/config",
    "resources",
    "migration",
    "tests",
    "other"
]


def normalize_path(path):
    return str(path).replace("\\", "/").lower()


def read_file_content(file_path):
    for encoding in ("utf-8", "latin-1"):
        try:
            with open(file_path, "r", encoding=encoding) as f:
                return f.read()
        except UnicodeDecodeError:
            continue
        except Exception as e:
            return f"[ERREUR DE LECTURE] {e}"
    return "[ERREUR DE LECTURE] Encodage non supporté"


def find_business_package(parts):
    if "java" not in parts and "kotlin" not in parts:
        return None

    try:
        lang_index = parts.index("java") if "java" in parts else parts.index("kotlin")
    except ValueError:
        return None

    after_lang = parts[lang_index + 1:]

    if len(after_lang) < 2:
        return None

    package_parts = after_lang[:-1]

    technical_names = {
        "com", "org", "net", "io", "app", "example",
        "config", "security", "controller", "service", "repository",
        "entity", "dto", "mapper", "exception", "exceptions",
        "validator", "validation", "util", "utils",
        "analysis", "model", "specification"
    }

    for part in package_parts:
        if part not in technical_names:
            return part

    return None


def detect_sub_layer(rel_str):
    if "/service/impl/" in rel_str:
        return "service/impl"
    if "/dto/request/" in rel_str:
        return "dto/request"
    if "/dto/response/" in rel_str:
        return "dto/response"
    if "/analysis/impl/" in rel_str:
        return "analysis/impl"
    if "/analysis/" in rel_str:
        return "analysis"
    if "/model/" in rel_str:
        return "model"
    if "/specification/" in rel_str:
        return "specification"
    if "/controller/" in rel_str:
        return "controller"
    if "/service/" in rel_str:
        return "service"
    if "/repository/" in rel_str:
        return "repository"
    if "/entity/" in rel_str:
        return "entity"
    if "/dto/" in rel_str:
        return "dto"
    if "/mapper/" in rel_str:
        return "mapper"
    if "/security/" in rel_str:
        return "security"
    if "/config/" in rel_str:
        return "config"
    if "/exception/" in rel_str or "/exceptions/" in rel_str:
        return "exception"
    if "/validator/" in rel_str or "/validation/" in rel_str:
        return "validator"
    if "/util/" in rel_str or "/utils/" in rel_str:
        return "util"
    return "other"


def detect_group(root_dir, file_path):
    rel = file_path.relative_to(root_dir)
    rel_str = normalize_path(rel)
    name = file_path.name.lower()
    parts = rel.parts

    if rel_str.startswith("src/test/"):
        return "tests"

    if rel_str.startswith("src/main/java/") or rel_str.startswith("src/main/kotlin/"):
        if name.endswith("application.java") or name.endswith("application.kt"):
            return "main class"

        business_package = find_business_package(list(parts))
        sub_layer = detect_sub_layer(rel_str)

        if business_package and sub_layer != "other":
            return f"{business_package}/{sub_layer}"
        if business_package:
            return f"{business_package}/other"
        if sub_layer != "other":
            return sub_layer

    return "other"


def layer_sort_key(group_name):
    if "/" not in group_name:
        if group_name in GLOBAL_ORDER:
            return (0, GLOBAL_ORDER.index(group_name), "", "")
        return (1, 999, group_name, "")

    business, layer = group_name.split("/", 1)

    if layer in COMMON_LAYERS:
        return (2, business, COMMON_LAYERS.index(layer), layer)

    return (3, business, 999, layer)


def collect_java_files(root_dir):
    """
    Parcourt le projet et retourne une liste de chemins (Path) de tous les fichiers .java
    (en ignorant les dossiers exclus).
    """
    java_files = []
    for current_root, dirs, files in os.walk(root_dir):
        dirs[:] = [d for d in dirs if d not in IGNORED_DIRS]
        for file_name in files:
            file_path = Path(current_root) / file_name
            if file_path.suffix.lower() == ".java":
                java_files.append(file_path)
    return sorted(java_files, key=lambda p: str(p).lower())


def interactive_select(java_files, root_dir):
    if not java_files:
        print("Aucun fichier Java trouvé dans le projet.")
        return []

    # 1. Regrouper les fichiers par couche
    grouped = {}
    for f in java_files:
        layer = detect_group(root_dir, f)
        grouped.setdefault(layer, []).append(f)

    # 2. Trier les couches selon l'ordre habituel
    sorted_layers = sorted(grouped.keys(), key=lambda x: layer_sort_key(x))

    selected_files = []

    # 3. Parcourir chaque couche
    for layer in sorted_layers:
        files = grouped[layer]
        print(f"\n--- Couche : {layer.upper()} ({len(files)} fichier(s)) ---")
        for i, f in enumerate(files, 1):
            rel = f.relative_to(root_dir)
            print(f"  {i:3d} : {f.stem}")    # juste le nom de la classe

        print("Choix : 'all' pour tout sélectionner, 'none' pour ignorer, 'q' pour quitter,")
        print("        ou les numéros séparés par des virgules (ex: 1,3,5)")

        while True:
            choice = input(f"Votre choix pour {layer} : ").strip().lower()
            if choice == 'q':
                print("Export annulé.")
                return []
            if choice == 'all':
                selected_files.extend(files)
                break
            if choice == 'none':
                break
            # Parse les numéros sélectionnés
            try:
                indices = [int(x.strip()) for x in choice.split(",") if x.strip().isdigit()]
                if any(i < 1 or i > len(files) for i in indices):
                    raise ValueError
                for i in indices:
                    selected_files.append(files[i - 1])
                break
            except (ValueError, TypeError):
                print("Saisie invalide. Réessaye (ex: 1,3,5 ou 'all' ou 'none').")

    return selected_files


def write_export(root_dir, output_file, selected_files):
    """
    Écrit l'export pour les fichiers sélectionnés.
    """
    # Groupement
    grouped = {}
    for file_path in selected_files:
        group = detect_group(root_dir, file_path)
        grouped.setdefault(group, []).append(file_path)

    # Tri interne des groupes
    for group in grouped:
        grouped[group] = sorted(grouped[group], key=lambda p: str(p).lower())

    ordered_groups = sorted(grouped.items(), key=lambda x: layer_sort_key(x[0]))

    with open(output_file, "w", encoding="utf-8") as out:
        out.write("=" * 120 + "\n")
        out.write("EXPORT JAVA INTERACTIF (FICHIERS .java UNIQUEMENT)\n")
        out.write("PROJET : {}\n".format(root_dir))
        out.write("=" * 120 + "\n\n")

        for group_name, files in ordered_groups:
            out.write("#" * 120 + "\n")
            out.write("GROUPE : {}\n".format(group_name.upper()))
            out.write("#" * 120 + "\n\n")

            for file_path in files:
                relative_path = file_path.relative_to(root_dir)

                out.write("-" * 120 + "\n")
                out.write("FICHIER : {}\n".format(relative_path))
                out.write("-" * 120 + "\n")
                out.write(read_file_content(file_path))
                out.write("\n\n")

    print(f"Export terminé : {output_file}")


def main():
    if len(sys.argv) < 2:
        print("Usage : python3 export_java_interactif.py <chemin_du_projet> [fichier_sortie.txt]")
        sys.exit(1)

    root_dir = Path(sys.argv[1]).resolve()
    if not root_dir.exists() or not root_dir.is_dir():
        print("Erreur : le chemin fourni n'est pas un dossier valide.")
        sys.exit(1)

    if len(sys.argv) >= 3:
        output_file = Path(sys.argv[2]).resolve()
    else:
        output_file = Path.cwd() / "export_java_selection.txt"

    # Collecte des .java uniquement
    java_files = collect_java_files(root_dir)
    if not java_files:
        print("Aucun fichier .java trouvé dans ce projet.")
        sys.exit(0)

    # Phase interactive
    selected = interactive_select(java_files, root_dir)
    if not selected:
        sys.exit(0)

    # Export
    write_export(root_dir, output_file, selected)


if __name__ == "__main__":
    main()