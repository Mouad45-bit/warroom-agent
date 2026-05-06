#!/usr/bin/env python3

import os
import sys
from pathlib import Path

IGNORED_DIRS = {
    ".git", ".idea", ".vscode", "target", "build", "node_modules",
    ".mvn", ".gradle", "__pycache__"
}

TEXT_EXTENSIONS = {
    ".java", ".kt", ".xml", ".yml", ".yaml", ".properties",
    ".sql", ".md", ".txt", ".json", ".html", ".css", ".js",
    ".ts", ".py", ".sh"
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
    "analysis",          # Nouveau : pour les interfaces d'analyse
    "analysis/impl",     # Nouveau : pour les implémentations d'analyseurs
    "model"              # Nouveau : pour les enums et classes modèles
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


def is_text_file(file_path):
    if file_path.suffix.lower() in TEXT_EXTENSIONS:
        return True

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            f.read(512)
        return True
    except Exception:
        return False


def read_file_content(file_path):
    for encoding in ("utf-8", "latin-1"):
        try:
            with open(file_path, "r", encoding=encoding) as f:
                return f.read()
        except UnicodeDecodeError:
            continue
        except Exception as e:
            return "[ERREUR DE LECTURE] {}".format(e)

    return "[ERREUR DE LECTURE] Encodage non supporté"


def find_business_package(parts):
    """
    Exemple :
    src/main/java/com/example/supportdesk/auth/controller/AuthController.java
    -> auth
    """
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
        "analysis",          # Pour éviter que "analysis" soit pris comme package métier
        "model"              # Idem
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
    if "/analysis/impl/" in rel_str:      # Avant analysis simple pour éviter capture partielle
        return "analysis/impl"
    if "/analysis/" in rel_str:
        return "analysis"
    if "/model/" in rel_str:
        return "model"
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

    if rel_str == "pom.xml":
        return "pom"

    if rel_str in {"mvnw", "mvnw.cmd", ".gitignore", "readme.md"}:
        return "root"

    if rel_str.startswith("src/test/"):
        return "tests"

    if rel_str.startswith("src/main/resources/db/migration/"):
        return "migration"

    if rel_str.startswith("src/main/resources/"):
        if name.startswith("application") and file_path.suffix.lower() in {".yml", ".yaml", ".properties"}:
            return "resources/config"
        return "resources"

    if rel_str.startswith("src/main/java/") or rel_str.startswith("src/main/kotlin/"):
        if name.endswith("application.java") or name.endswith("application.kt"):
            return "main class"

        business_package = find_business_package(list(parts))
        sub_layer = detect_sub_layer(rel_str)

        if business_package and sub_layer != "other":
            return "{}/{}".format(business_package, sub_layer)

        if business_package:
            return "{}/other".format(business_package)

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


def collect_files(root_dir):
    grouped = {}

    for current_root, dirs, files in os.walk(root_dir):
        dirs[:] = [d for d in dirs if d not in IGNORED_DIRS]

        for file_name in files:
            file_path = Path(current_root) / file_name

            if not is_text_file(file_path):
                continue

            group = detect_group(root_dir, file_path)
            grouped.setdefault(group, []).append(file_path)

    for group in grouped:
        grouped[group] = sorted(grouped[group], key=lambda p: str(p).lower())

    return grouped


def write_export(root_dir, output_file):
    grouped = collect_files(root_dir)
    ordered_groups = sorted(grouped.items(), key=lambda x: layer_sort_key(x[0]))

    with open(output_file, "w", encoding="utf-8") as out:
        out.write("=" * 120 + "\n")
        out.write("EXPORT SPRING BOOT / MAVEN PAR PACKAGE METIER + COUCHE\n")
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

    print("Export terminé : {}".format(output_file))


def main():
    if len(sys.argv) < 2:
        print("Usage : python3 export_spring_by_domain.py <chemin_du_projet> [fichier_sortie.txt]")
        sys.exit(1)

    root_dir = Path(sys.argv[1]).resolve()

    if not root_dir.exists() or not root_dir.is_dir():
        print("Erreur : le chemin fourni n'est pas un dossier valide.")
        sys.exit(1)

    if len(sys.argv) >= 3:
        output_file = Path(sys.argv[2]).resolve()
    else:
        output_file = Path.cwd() / "spring_project_by_domain.txt"

    write_export(root_dir, output_file)


if __name__ == "__main__":
    main()