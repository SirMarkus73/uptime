# [1.4.0](https://github.com/SirMarkus73/uptime/compare/v1.3.0...v1.4.0) (2026-10-03)


### Bug Fixes

* **server:** Serializar las respuestas con el mismo esquema que las documenta ([5b9f824](https://github.com/SirMarkus73/uptime/commit/5b9f824e5a6e3770877b9c329d6c36a96fba8816))


### Features

* **monitors:** Ejecutar los monitores periódicamente según su intervalo ([473f734](https://github.com/SirMarkus73/uptime/commit/473f734b052abaaae86cca386796414d2be125a4))
* **monitors:** Mostrar la evolución del tiempo de respuesta en el detalle del monitor ([1e154f4](https://github.com/SirMarkus73/uptime/commit/1e154f4f516426bbdb04c7b85a724e02cc9689e4))
* **monitors:** Permitir configurar cada cuántos minutos se ejecuta un monitor ([7d3909d](https://github.com/SirMarkus73/uptime/commit/7d3909db556c7cae47a5fee6d5e2a1e194d3d5fa))

# [1.3.0](https://github.com/SirMarkus73/uptime/compare/v1.2.0...v1.3.0) (2026-10-02)


### Bug Fixes

* **auth:** Permitir iniciar sesión desde otros dispositivos de la red ([b7d2f31](https://github.com/SirMarkus73/uptime/commit/b7d2f31f689632aeda3446dfee54a7a58d984a5f))
* **monitors:** Normalizar la URL de los monitores al crearlos y editarlos ([f9b1354](https://github.com/SirMarkus73/uptime/commit/f9b1354c5b9a3b1b9623e2fe68b57ff1413521d3))


### Features

* **design-system:** Añadir AlertDialog que se muestra como drawer en móvil ([f2b4443](https://github.com/SirMarkus73/uptime/commit/f2b4443f4166725ec45b87758b72769e6835accb))
* **monitors:** Confirmar antes de eliminar un monitor ([7c62ab1](https://github.com/SirMarkus73/uptime/commit/7c62ab1c34b572f567e77a2dc1edc7cd0c4c76ad))

# [1.2.0](https://github.com/SirMarkus73/uptime/compare/v1.1.0...v1.2.0) (2026-10-02)


### Bug Fixes

* **db:** Devolver las fechas en formato ISO 8601 ([a0b5591](https://github.com/SirMarkus73/uptime/commit/a0b5591a31ebd67342ffd57f09c6994250531aa1))
* **db:** Guardar las fechas de monitores y comprobaciones con zona horaria ([d56b2f1](https://github.com/SirMarkus73/uptime/commit/d56b2f11e8f7bc3255e9884dd25eaa8a0fbb7457))
* **monitors:** Impedir ejecutar monitores de otros usuarios ([c4c33b7](https://github.com/SirMarkus73/uptime/commit/c4c33b7c35cd2c7d046a1aba1b06a6a379b297bd))
* **monitors:** Validar el id y documentar el 404 al obtener un monitor ([a8c09c9](https://github.com/SirMarkus73/uptime/commit/a8c09c929a484543a825ef64ec05452ec71a5336))
* **server:** Contar por separado los dos límites de peticiones ([7a13154](https://github.com/SirMarkus73/uptime/commit/7a13154b9c52fb29f8962eeaf6da54e7e9d9a922))


### Features

* **monitors:** Añadir la página de detalle de un monitor ([ed4d875](https://github.com/SirMarkus73/uptime/commit/ed4d8752a7620a583ba0cba9fce2df21946d9b86))

# [1.1.0](https://github.com/SirMarkus73/uptime/compare/v1.0.0...v1.1.0) (2026-10-01)


### Features

* **monitors:** Permitir eliminar monitores ([5a7a9de](https://github.com/SirMarkus73/uptime/commit/5a7a9de4f3111a8b8e8608e7a511e0d8173e76d4))

# 1.0.0 (2026-10-01)


### Bug Fixes

* Arreglar tipos de test e2e ([357a0c4](https://github.com/SirMarkus73/uptime/commit/357a0c4176a0d26ec3a9d30a81eb116fae93cc3c))


### Features

*  Instalar commitizen, comitlint y semantic-release ([9bbefcf](https://github.com/SirMarkus73/uptime/commit/9bbefcf4b0cef6adb4747988aaf0821f66e6d81e))
* Añadir better auth ([e3681a6](https://github.com/SirMarkus73/uptime/commit/e3681a6c38031503ba71bb5e1ed78d7c14756c2c))
* Añadir extensiones recomendadas y configuración del proyecto ([77fc770](https://github.com/SirMarkus73/uptime/commit/77fc770508754c6840dbe6b552c4f2be59ce6017))
* Añadir lucide icons ([1896cf4](https://github.com/SirMarkus73/uptime/commit/1896cf45feebc0e7b9d7e3156709c11c8df9149e))
* Añadir mejoras a turbo.json ([a546ec6](https://github.com/SirMarkus73/uptime/commit/a546ec6ccbaf3c0fd2d890424ac794f16e6c42b9))
* Añadir monitores (ejecutados manualmente) ([79137ca](https://github.com/SirMarkus73/uptime/commit/79137ca988df8b9c0e3ae161b7fc2b50915587fd))
* Añadir mutations optimistas y un helper para pasar de minutos a segundos ([6202d1c](https://github.com/SirMarkus73/uptime/commit/6202d1c3c096a1bce333260fcfbb230493c2b89c))
* Añadir pequeño frontend ([fe6cfe1](https://github.com/SirMarkus73/uptime/commit/fe6cfe144e2c724f8f90787c4c59d29e114a69aa))
* Añadir rate limiter ([6738b9b](https://github.com/SirMarkus73/uptime/commit/6738b9bfad0301e5724546b533092d9c143a9ed9))
* Añadir skill frontend-design ([dc12ba9](https://github.com/SirMarkus73/uptime/commit/dc12ba9f9e8742fcb474d17688106fb14061ae96))
* Añadir zod y enpoint para comprobar el estado de una url ([3f0b8bb](https://github.com/SirMarkus73/uptime/commit/3f0b8bb828bcff26436ac704cd36cead0d48ec3a))
* **backend:** Añadir el plugin de swagger ([51b9214](https://github.com/SirMarkus73/uptime/commit/51b9214780a773cbbe0c6b93b3c90fa31eab51d4))
* Instalar drizzle en el proyecto ([ef4ffcb](https://github.com/SirMarkus73/uptime/commit/ef4ffcbf1d210d5c084a04317f5a07b799e5f174))
* Mejorar indices de la bd ([074c936](https://github.com/SirMarkus73/uptime/commit/074c936bea5a0a2f03e240b7b7b28337d0e3c979))
* Mejorar login y register ([4755ab1](https://github.com/SirMarkus73/uptime/commit/4755ab1e275f97069114e94da2e634a84f1e922c))
