"""Prueba de la web contra el backend REAL (EDT 5.1.1), sin mocks.

Requiere la demo local del backend corriendo (Postgres + PostgREST + API con
LLM simulado y datos ficticios), y esta web compilada apuntando a ella:

    # en el repo del backend
    POSTGREST_BIN=/ruta/postgrest python -m tests.integracion.demo --salida /tmp/demo.json
    # en este repo
    VITE_API_URL=http://127.0.0.1:8001 VITE_SUPABASE_URL=http://127.0.0.1:54321 \
      VITE_SUPABASE_ANON_KEY=<anon_key de demo.json> VITE_POLICY_VERSION=2026-09-11 npm run build
    npx vite preview --port 4173 --host 127.0.0.1 &
    python e2e/flujo_real.py --demo /tmp/demo.json [--capturas carpeta/]

Recorre el MVP como lo haría una familia, en un celular (375 px):
bitácora con historial, registro sin conexión, edición con motivo, dictado
(reconocedor de voz simulado: en un navegador automatizado no hay micrófono),
turnos, medicamentos (también sin conexión), asistente con citas, resúmenes e
impresión, red, centros, exportación de datos y eliminación de cuenta.
"""

from __future__ import annotations

import argparse
import base64
import json
import re
import time
from datetime import date, timedelta
from pathlib import Path

import httpx
from playwright.sync_api import Page, expect, sync_playwright

CLAVE_SESION = "sb-127-auth-token"  # supabase-js: sb-<primer segmento del host>-auth-token

VOZ_SIMULADA = """
window.SpeechRecognition = window.webkitSpeechRecognition = class {
  start() {
    setTimeout(() => {
      const r = Object.assign([{ transcript: "Le di la pastilla de losartán de las ocho" }], { isFinal: true });
      this.onresult && this.onresult({ resultIndex: 0, results: [r] });
      setTimeout(() => this.onend && this.onend(), 50);
    }, 300);
  }
  stop() { this.onend && this.onend(); }
  abort() {}
};
"""


def _sesion(persona: dict) -> str:
    payload = persona["token"].split(".")[1]
    claims = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
    return json.dumps(
        {
            "access_token": persona["token"],
            "refresh_token": "demo",
            "token_type": "bearer",
            "expires_in": claims["exp"] - int(time.time()),
            "expires_at": claims["exp"],
            "user": {
                "id": persona["id"],
                "email": persona["email"],
                "aud": "authenticated",
                "role": "authenticated",
                "app_metadata": {},
                "user_metadata": {},
                "created_at": "2026-01-01T00:00:00Z",
            },
        }
    )


class Recorrido:
    def __init__(self, page: Page, web: str, capturas: Path | None, sufijo: str):
        self.page, self.web, self.capturas, self.sufijo = page, web, capturas, sufijo
        self.n = 0

    def ir(self, ruta: str) -> None:
        self.page.goto(self.web + ruta)

    def paso(self, nombre: str) -> None:
        print(f"  ✓ {nombre}", flush=True)

    def captura(self, nombre: str, completa: bool = True) -> None:
        sin_scroll = self.page.evaluate(
            "document.documentElement.scrollWidth <= document.documentElement.clientWidth"
        )
        assert sin_scroll, f"scroll horizontal en {nombre}"
        if self.capturas:
            # En una captura de página completa el header fijo quedaría a mitad
            # de la imagen: para el manual se muestra en su lugar.
            self.page.add_style_tag(content='header[class*="header"] { position: static !important; }')
            self.n += 1
            self.page.screenshot(
                path=self.capturas / f"{self.sufijo}_{self.n:02d}_{nombre}.png", full_page=completa
            )


def recorrido_ana(r: Recorrido, ctx, demo: dict) -> None:
    page, pid = r.page, demo["paciente_id"]

    r.ir("/")
    # Acotado a <main>: el header también lista a la persona (oculto en móvil).
    expect(page.locator("main").get_by_text("Elba Soto")).to_be_visible(timeout=20000)
    expect(page.get_by_text("Última entrada", exact=True)).to_be_visible()
    r.captura("inicio")
    r.paso("inicio con la persona cuidada y su última entrada")

    r.ir(f"/patients/{pid}")
    expect(page.get_by_role("heading", name="Bitácora")).to_be_visible(timeout=20000)
    expect(page.get_by_text("85 años")).to_be_visible()
    expect(page.get_by_text("Por voz").first).to_be_visible()
    r.captura("bitacora")
    corregida = page.locator("article").filter(has_text="metformina 850 mg")
    corregida.get_by_role("button", name="Ver historial de cambios").click()
    expect(page.get_by_text("Versión original")).to_be_visible()
    expect(page.get_by_text("Faltaba anotar la metformina")).to_be_visible()
    r.captura("historial", completa=False)
    r.paso("historial de una entrada corregida (original, autor, hora, motivo)")

    caja = page.get_by_placeholder("Ej: Durmió bien")
    registrar = page.get_by_role("button", name="Registrar", exact=True)
    caja.fill("Le dolió la rodilla derecha al caminar.")
    registrar.click()
    expect(page.get_by_text("Registrado ✓")).to_be_visible()
    expect(page.locator("article").filter(has_text="Le dolió la rodilla derecha")).to_have_count(1)
    r.paso("registro en línea")

    page.get_by_role("button", name="Dictar").click()
    expect(caja).to_have_value(re.compile("pastilla de losartán"))
    expect(page.get_by_text("Tipo sugerido por lo que dictaste: Medicamento")).to_be_visible()
    expect(page.get_by_role("radio", name="Medicamento")).to_be_checked()
    registrar.click()
    tarjeta_voz = page.locator("article").filter(has_text="Le di la pastilla de losartán")
    expect(tarjeta_voz.get_by_text("Por voz")).to_be_visible()
    r.paso("dictado: texto, tipo sugerido y origen 'voz'")

    ctx.set_offline(True)
    expect(page.get_by_text("Sin conexión.")).to_be_visible(timeout=5000)
    caja.fill("Tomó agua con la pastilla de la tarde.")
    registrar.click()
    expect(
        page.get_by_text("Guardado en este dispositivo. Se enviará al volver la conexión.", exact=True)
    ).to_be_visible()
    expect(page.get_by_text("Pendiente de sincronizar")).to_be_visible()
    r.captura("sin_conexion", completa=False)
    ctx.set_offline(False)
    expect(page.get_by_text("Pendiente de sincronizar")).to_have_count(0, timeout=15000)
    expect(page.locator("article").filter(has_text="Tomó agua con la pastilla de la tarde")).to_have_count(1)
    r.paso("registro sin conexión que se sincroniza al volver la red")

    page.get_by_role("button", name=re.compile(r"^Editar")).first.click()
    form = page.get_by_role("form", name="Editar entrada")
    form.locator("textarea").fill("Tomó agua con la pastilla de la tarde (200 ml).")
    form.get_by_label("Motivo del cambio").fill("Faltaba la cantidad")
    form.get_by_role("button", name="Guardar cambios").click()
    expect(page.get_by_role("form", name="Editar entrada")).to_have_count(0)
    editada = page.locator("article").filter(has_text="(200 ml)")
    expect(editada.get_by_text("Editada")).to_be_visible()
    r.paso("corrección con motivo (queda 'Editada')")

    r.ir(f"/patients/{pid}/turnos")
    de_turno = page.locator("div.card").filter(has_text="De turno ahora")
    expect(de_turno).to_be_visible(timeout=20000)
    expect(de_turno.locator("strong", has_text="Beto Soto")).to_be_visible()
    expect(de_turno.get_by_text("Registrado en este turno")).to_be_visible()
    pasado_manana = (date.today() + timedelta(days=2)).isoformat()
    page.get_by_label("Día").fill(pasado_manana)
    page.get_by_role("button", name="Agendar turno").click()
    expect(page.get_by_text("Turno agendado ✓")).to_be_visible()
    r.captura("turnos")
    r.paso("turnos: de turno ahora, relevo y agenda")

    r.ir(f"/patients/{pid}/medicamentos")
    expect(page.get_by_text("Próximas dosis (24 horas)")).to_be_visible(timeout=20000)
    expect(page.get_by_text("Adherencia · últimos 7 días")).to_be_visible()
    page.get_by_role("button", name="Tomada", exact=True).first.click()
    expect(page.get_by_text("Tomada · Tú").first).to_be_visible()
    ctx.set_offline(True)
    page.get_by_role("button", name="Omitida", exact=True).first.click()
    expect(page.get_by_text("Omitida · pendiente de sincronizar")).to_be_visible()
    ctx.set_offline(False)
    expect(page.get_by_text("Omitida · Tú")).to_be_visible(timeout=15000)
    r.captura("medicamentos")
    r.paso("dosis en línea y sin conexión")

    r.ir(f"/patients/{pid}/asistente")
    expect(page.get_by_text("¿Cómo ha dormido esta semana?").first).to_be_visible(timeout=20000)
    page.get_by_role("button", name="¿Tomó todos sus medicamentos?").click()
    expect(page.get_by_text("Según lo registrado").first).to_be_visible(timeout=20000)
    expect(page.get_by_role("button", name="Ocultar registros").first).to_be_visible()
    expect(page.get_by_text("Respuestas verificables en 30 días")).to_be_visible()
    r.captura("asistente")
    r.paso("asistente con citas verificables y KPI")

    r.ir(f"/patients/{pid}/resumenes")
    expect(page.get_by_role("link", name="Ver e imprimir").first).to_be_visible(timeout=20000)
    page.get_by_label("Período").select_option("30")
    page.get_by_role("button", name="Generar resumen").click()
    expect(page.get_by_role("link", name="Ver e imprimir")).to_have_count(2, timeout=20000)
    r.captura("resumenes")
    page.get_by_role("link", name="Ver e imprimir").first.click()
    expect(page.get_by_role("heading", name="Resumen de cuidado")).to_be_visible()
    expect(page.get_by_text("Trazabilidad del registro")).to_be_visible()
    expect(page.get_by_text(re.compile(r"Corregidas: [1-9]"))).to_be_visible()
    r.captura("resumen_detalle")
    page.emulate_media(media="print")
    expect(page.get_by_role("button", name="Imprimir o guardar PDF")).to_be_hidden()
    r.captura("resumen_impresion")
    page.emulate_media(media="screen")
    r.paso("resumen asíncrono, trazabilidad y vista de impresión")

    r.ir(f"/patients/{pid}/red")
    expect(page.get_by_text("Carmen Rojas")).to_be_visible(timeout=20000)
    r.captura("red")
    r.paso("red de cuidado")

    r.ir("/centros")
    expect(page.get_by_text("CESFAM Ejemplo Norte")).to_be_visible(timeout=20000)
    page.get_by_label("Tipo").select_option("Farmacia")
    expect(page.get_by_text("Farmacia de Turno Ejemplo")).to_be_visible()
    expect(page.get_by_text("CESFAM Ejemplo Norte")).to_have_count(0)
    r.captura("centros")
    r.paso("centros con filtros")

    r.ir("/me")
    expect(page.get_by_role("heading", name="Tus datos")).to_be_visible(timeout=20000)
    with page.expect_download() as descarga:
        page.get_by_role("button", name="Descargar mis datos (JSON)").click()
    datos = json.loads(Path(descarga.value.path()).read_text())
    assert datos["entradas_bitacora"] and "turnos" in datos and datos["revisiones_bitacora"]
    r.captura("perfil")
    r.paso("exportación de datos (ARCO)")


def recorrido_carmen(r: Recorrido, demo: dict) -> None:
    page, pid = r.page, demo["paciente_id"]
    r.ir(f"/patients/{pid}/turnos")
    expect(page.get_by_text("Tu rol en este grupo es de lectura")).to_be_visible(timeout=20000)
    r.paso("rol lectura no agenda turnos")
    r.ir("/me")
    page.get_by_label("Escribe ELIMINAR para confirmar").fill("ELIMINAR")
    page.get_by_role("button", name="Eliminar mi cuenta").click()
    expect(page).to_have_url(re.compile(r"/sign-in"), timeout=20000)
    sesiones = page.evaluate("Object.keys(localStorage).filter(k => /^sb-.+-auth-token$/.test(k))")
    assert sesiones == [], f"quedó una sesión guardada: {sesiones}"
    ana = demo["personas"]["ana"]
    miembros = httpx.get(
        f"{demo['api']}/patients/{pid}/members", headers={"Authorization": f"Bearer {ana['token']}"}
    ).json()
    assert all(m["email"] != demo["personas"]["carmen"]["email"] for m in miembros)
    r.paso("eliminación de cuenta (ARCO) y salida del grupo")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--demo", required=True)
    ap.add_argument("--web", default="http://127.0.0.1:4173")
    ap.add_argument("--capturas")
    args = ap.parse_args()
    demo = json.loads(Path(args.demo).read_text())
    capturas = Path(args.capturas) if args.capturas else None
    if capturas:
        capturas.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        errores: list[str] = []

        def contexto(persona: str, ancho: int, alto: int, voz: bool = False):
            ctx = browser.new_context(
                viewport={"width": ancho, "height": alto},
                device_scale_factor=2,
                locale="es-CL",
                timezone_id="America/Santiago",
            )
            # Una sola vez por pestaña: si la app cierra la sesión y recarga,
            # la prueba no debe volver a iniciarla.
            ctx.add_init_script(
                "if (!sessionStorage.getItem('e2e-sesion')) {"
                f" localStorage.setItem({json.dumps(CLAVE_SESION)}, {json.dumps(_sesion(demo['personas'][persona]))});"
                " sessionStorage.setItem('e2e-sesion', '1'); }"
            )
            if voz:
                ctx.add_init_script(VOZ_SIMULADA)
            return ctx

        print("Ana (administradora) en celular:")
        ctx = contexto("ana", 375, 812, voz=True)
        page = ctx.new_page()
        page.on("pageerror", lambda e: errores.append(str(e)))
        recorrido_ana(Recorrido(page, args.web, capturas, "movil"), ctx, demo)
        ctx.close()

        if capturas:
            print("Capturas de escritorio:")
            ctx = contexto("ana", 1280, 860)
            page = ctx.new_page()
            r = Recorrido(page, args.web, capturas, "escritorio")
            for ruta, nombre, texto in [
                (f"/patients/{demo['paciente_id']}", "bitacora", "Registros"),
                (f"/patients/{demo['paciente_id']}/asistente", "asistente", "Preguntas anteriores"),
                (f"/patients/{demo['paciente_id']}/medicamentos", "medicamentos", "Medicamentos activos"),
            ]:
                r.ir(ruta)
                expect(page.get_by_text(texto).first).to_be_visible(timeout=20000)
                r.captura(nombre)
            ctx.close()

        print("Carmen (rol lectura):")
        ctx = contexto("carmen", 375, 812)
        page = ctx.new_page()
        page.on("pageerror", lambda e: errores.append(str(e)))
        recorrido_carmen(Recorrido(page, args.web, None, "carmen"), demo)
        ctx.close()
        browser.close()

    print("Errores de JavaScript:", errores or "ninguno")
    print("RESULTADO: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
