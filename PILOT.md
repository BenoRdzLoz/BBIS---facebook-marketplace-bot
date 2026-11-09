# Resultado del piloto local

Se clonó el fork y se ejecutó `python pilot_check.py`. Salida 2: datos no aptos para prueba real.

- items.csv: tres fotos inexistentes; una referencia termina con comilla sobrante; producto y ubicación de ejemplo.
- vehicles.csv: columnas desalineadas y Groups ausente.
- Simulación del flujo original: delete_existing -> publish. Las dos operaciones se sustituyeron por mocks: cero acciones externas.
- Entorno de ejecución inspeccionado: sin Selenium, webdriver-manager, Chrome o sesión Facebook configurados.
- Este fork es de GeorgiKeranov/facebook-marketplace-bot: publica artículos/vehículos, no responde mensajes ni incluye IA.

## Para continuar con un anuncio real

Aportar título, precio MXN, descripción, categoría, condición, ubicación y fotos reales de un único artículo. El piloto debe preparar ese anuncio y omitir la eliminación/republicación existente. Se requiere una máquina con Chrome, Selenium y webdriver-manager, y acceso del propietario a Facebook en esa máquina. No subir cookies o credenciales a GitHub.

La validación offline no demuestra compatibilidad con la interfaz actual de Facebook; los selectores originales están en inglés. La sesión de GitHub no proporciona acceso a Facebook. El flujo live original no fue ejecutado.
