# Konzept und Entscheidungen

Diese App ist ein internes Erhebungswerkzeug für die GAD-Mini-Studie zur Frage:

> In welchen Entscheidungssituationen vertrauen Menschen KI - und in welchen nicht?

Die App wurde nicht als öffentliche Website gebaut, sondern als kleines Forschungsinstrument. Deshalb beginnt sie nicht mit einer Landingpage, sondern direkt mit dem passwortgeschützten Zugang zur Befragung. Der wichtigste Zweck ist, dass alle Teilnehmenden dieselben Szenarien, dieselbe Skala und denselben Ablauf sehen.

## Grundstruktur

Die App besteht aus zwei Bereichen:

- `/` für die Befragung
- `/admin` für Auswertung und CSV-Export

Beide Bereiche haben getrennte Passwörter. So können Teilnehmende nur den Fragebogen öffnen, während die Auswertung im Adminbereich bleibt.

Der Survey läuft als eine Frage pro Bildschirm. Jede Frage zeigt genau eine Variante eines Szenarios. Das ist absichtlich so gewählt: Auf dem Smartphone bleibt der Bildschirm ruhig, die Skala ist gut antippbar, und die Teilnehmenden müssen nicht mehrere Antwortblöcke gleichzeitig vergleichen.

Die mobile Ansicht wurde bewusst knapp gehalten. Auf kleinen Bildschirmen stehen unter den Zahlen 1 bis 5 nur kurze Skalenlabels. Die ausführliche Legende bleibt auf größeren Bildschirmen sichtbar. Im Browsercheck mit 390 x 844 px passten alle 20 Fragen ohne Scrollen in den sichtbaren Bereich.

## Methodische Herleitung

Die Studie vergleicht zehn medizinische Entscheidungssituationen. Jedes Szenario hat zwei Varianten:

- Variante A: Die KI gibt eine Empfehlung, ein Mensch entscheidet final.
- Variante B: Die KI entscheidet vollständig autonom.

Damit H2 sauber prüfbar bleibt, werden beide Varianten jedes Szenarios erhoben. Sie werden aber nicht mehr direkt hintereinander gezeigt. Die 20 Fragen werden pro Person gemischt, und die App verhindert, dass zwei Fragen zum selben Szenario unmittelbar aufeinander folgen. Dadurch wird weniger offensichtlich, dass gerade Variante A und B desselben Falls verglichen werden.

Die tatsächliche Reihenfolge wird mitgespeichert, damit sie später nachvollziehbar bleibt. Zusätzlich wird pro Szenario gespeichert, ob Variante A oder B zuerst erschien.

Die Risikogruppen sind zentral für H1:

- niedrig: Szenario 1, 2 und 4
- mittel: Szenario 3, 5 und 6
- hoch: Szenario 7, 8, 9 und 10

Der Adminbereich berechnet deshalb nicht nur Werte pro Szenario, sondern auch Mittelwerte nach Risikogruppe.

Die Risikoeinstufung wird nur intern genutzt. Sie wird den Teilnehmenden im Fragebogen nicht angezeigt, damit die Kategorien niedrig, mittel und hoch die Antworten nicht vorprägen.

## Datenschutz

Die App speichert keine Namen, keine E-Mail-Adressen, keine Freitexte, keine IP-Adressen, keinen Standort und keinen User-Agent. Erfasst werden nur:

- die 20 Skalenwerte
- anonyme Stichprobenangaben
- die Reihenfolge der Szenarien und Varianten
- Start- und Absendezeit
- eine technische Antwort-ID
- die App-Version
- ein Pretest-Kennzeichen

Vor dem Start müssen Teilnehmende aktiv bestätigen, dass sie den Hinweis gelesen haben. Dort steht auch, dass RWU-Professor*innen, RWU-Mitarbeiter*innen und RWU-Studierende nicht teilnehmen sollen.

## Technik

Die App nutzt Next.js mit App Router, TypeScript und Tailwind. Die Seitenstruktur bleibt bewusst klein:

- `src/lib/survey.ts` enthält Szenarien, Skala, Varianten und Risikogruppen.
- `src/lib/order.ts` erzeugt und prüft die randomisierte Reihenfolge.
- `src/lib/analysis.ts` enthält die Auswertungslogik.
- `src/lib/validation.ts` prüft eingehende Antworten mit Zod.
- `src/lib/db.ts` speichert Antworten in Upstash Redis.
- `src/components/survey-app.tsx` enthält den mobilen Survey-Flow.
- `src/app/admin/page.tsx` rendert das Admin-Dashboard.

Upstash Redis wurde gewählt, weil die App auf Vercel möglichst einfach laufen soll. Vercel selbst bietet kein dauerhaft beschreibbares Dateisystem für Serverless-Funktionen. Eine klassische Datenbank wäre für diese kleine Studie möglich, aber unnötig schwer. Upstash lässt sich nativ in Vercel installieren und setzt die nötigen Variablen automatisch.

Lokal kann die App ohne Upstash starten. Dann schreibt sie in eine ignorierte Entwicklungsdatei. Für die echte Erhebung auf Vercel wird Upstash genutzt.

## Sicherheit

Die App ist intern, aber nicht offen. Deshalb gibt es:

- getrennte Passwörter für Survey und Admin
- serverseitige Passwortprüfung
- httpOnly Session-Cookies
- Zod-Validierung aller Antworten
- keine Secrets im Code
- CSV-Export ohne personenbezogene Felder

Bewusst nicht eingebaut wurden Rate-Limiting, Bot-Schutz, Cookie-Banner und externe Tracking- oder Datenschutz-Komponenten. Die App wird nicht öffentlich beworben, sondern nur direkt an eingeladene Personen weitergegeben.

## KI-Nutzung

Die App wurde mit Unterstützung von Codex und Claude Code erstellt. Die KI wurde für Planung, Code-Erstellung, UI-Umsetzung, Sicherheitschecks, Debugging und Dokumentation genutzt. Inhaltliche Entscheidungen zur Studie, zur Datenerhebung und zur späteren Interpretation bleiben Aufgabe der Projektbearbeitung.
