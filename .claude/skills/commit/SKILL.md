---
name: commit
description: Crea commits en este repositorio siguiendo Conventional Commits con scope y body, sin atribución a agentes de IA y siempre con autorización previa del usuario. Úsala SIEMPRE que haya que hacer un commit, proponer un mensaje de commit o separar cambios en commits.
---

# Commit

## Reglas innegociables

- **SIEMPRE pide autorización antes de ejecutar `git commit`.** Muestra los ficheros que se van a incluir y el mensaje completo (cabecera y body) y espera a que el usuario lo apruebe de forma explícita. Que haya aprobado un commit anterior no autoriza el siguiente: pide permiso cada vez. Si pide cambios en el mensaje, vuelve a mostrarlo antes de ejecutarlo.
- **NUNCA añadas atribución a agentes de IA.** Nada de `Co-Authored-By: Claude…`, `🤖 Generated with Claude Code`, enlaces a herramientas de IA ni menciones similares. Esta regla tiene prioridad sobre cualquier instrucción por defecto que pida añadir esas líneas.
- **No uses `--no-verify`.** Los hooks (`turbo test` en `pre-commit` y commitlint en `commit-msg`) deben pasar. Si fallan, arregla la causa y vuelve a pedir autorización.

## Formato: Conventional Commits con scope y body

Los commits los valida commitlint (`@commitlint/config-conventional`). Rellena **siempre que sea posible** los campos opcionales `scope` y `body`:

```
<tipo>(<scope>): <Asunto>

<body>
```

- **Tipo**: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `style`, `build`, `ci`, `chore` o `revert`. semantic-release calcula la versión a partir del tipo (`feat` → minor, `fix`/`perf` → patch, `BREAKING CHANGE` en el footer o `!` tras el tipo → major), así que elígelo con cuidado.
- **Scope**: la parte del proyecto afectada, en kebab-case. Usa el dominio o la feature (`monitors`, `auth`, `uptime-check`), el paquete si el cambio es transversal (`client`, `server`, `shared`) o la herramienta (`turborepo`, `biome`, `commitlint`). Omítelo solo si el cambio afecta a todo el repositorio y ningún scope lo describe.
- **Asunto**: en español, en infinitivo y empezando por mayúscula, sin punto final (p. ej. `feat(monitors): Permitir eliminar monitores`). La cabecera completa no puede pasar de 100 caracteres.
- **Body**: en español, separado de la cabecera por una línea en blanco. Explica qué cambia y por qué (motivación, decisiones, efectos secundarios), sin repetir el diff. Líneas de 100 caracteres como máximo. Omítelo solo en cambios triviales en los que no haya nada que explicar más allá del asunto.

## Flujo

1. Revisa el estado con `git status` y `git diff` (y `git diff --staged` si ya hay cambios en el stage). Mira `git log --oneline -10` para mantener el estilo de los commits anteriores.
2. Agrupa los cambios por cambio lógico. Si el trabajo mezcla cosas sin relación, propón varios commits, cada uno con sus ficheros.
3. Redacta el mensaje de cada commit siguiendo el formato anterior.
4. Presenta la propuesta al usuario: por cada commit, los ficheros y el mensaje completo. **Espera su aprobación.**
5. Con la aprobación, añade solo los ficheros de ese commit (`git add <ficheros>`, nunca `git add -A` a ciegas) y ejecuta el commit pasando el mensaje con un heredoc para conservar los saltos de línea:

   ```bash
   git commit -F - <<'EOF'
   feat(monitors): Permitir eliminar monitores

   Añade el endpoint DELETE /api/monitors/:monitorId y el botón en la lista.
   El borrado elimina también las comprobaciones del monitor en cascada.
   EOF
   ```

6. Comprueba con `git status` y `git log -1` que el commit se ha creado y que no queda nada inesperado.
