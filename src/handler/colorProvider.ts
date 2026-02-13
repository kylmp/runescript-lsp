import type { Connection, ColorInformation, ColorPresentation, DocumentColorParams, ColorPresentationParams } from "vscode-languageserver/node.js";
import { Color, Range, TextEdit } from "vscode-languageserver-types";
import { getDocuments } from "../utils/documentUtils.js";
import { COLOR24_REGEX, RECOLOR_REGEX } from "../resource/enum/regex.js";
import { getLanguage } from "../utils/handlerUtils.js";

export function registerColorProviderHandler(connection: Connection): void {
  connection.onDocumentColor((params: DocumentColorParams): ColorInformation[] => {
    const language = getLanguage(params);
    if (!language) return [];
    if (language === 'floconfig' || language === 'interface') {
      return color24Provider(params);
    } else if (language.endsWith('config')) {
      return recolorProvider(params);
    }
    return [];
  });

  connection.onColorPresentation((params: ColorPresentationParams): ColorPresentation[] => {
    const language = getLanguage(params);
    if (!language) return [];
    if (language === 'floconfig' || language === 'interface') {
      return color24Presentation(params);
    } else if (language.endsWith('config')) {
      return recolorPresentation(params);
    }
    return [];
  });
}

function color24Provider(params: DocumentColorParams): ColorInformation[] {
  const doc = getDocuments().get(params.textDocument.uri);
  if (!doc) return [];
  const text = doc.getText();
  COLOR24_REGEX.lastIndex = 0;

  const colorInfos: ColorInformation[] = [];
  let match: RegExpExecArray | null;
  while ((match = COLOR24_REGEX.exec(text)) !== null) {
    const rgb = parseInt(match[2]!, 16);
    if (Number.isNaN(rgb)) continue;

    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = rgb & 0xff;

    const valueStart = match.index + match[1]!.length + 1;
    const valueEnd = valueStart + match[2]!.length;

    colorInfos.push({
      color: Color.create(r / 255, g / 255, b / 255, 1),
      range: Range.create(doc.positionAt(valueStart), doc.positionAt(valueEnd)),
    });
  }

  return colorInfos;
}

function recolorProvider(params: DocumentColorParams): ColorInformation[] {
  const doc = getDocuments().get(params.textDocument.uri);
  if (!doc) return [];
  const text = doc.getText();
  RECOLOR_REGEX.lastIndex = 0;

  const colorInfos: ColorInformation[] = [];
  let match: RegExpExecArray | null;
  while ((match = RECOLOR_REGEX.exec(text)) !== null) {
    const rgb = parseInt(match[2]!, 10);
    if (Number.isNaN(rgb)) continue;

    const r = (rgb >> 10) & 0x1f;
    const g = (rgb >> 5) & 0x1f;
    const b = rgb & 0x1f;

    const valueStart = match.index + match[1]!.length + 1;
    const valueEnd = valueStart + match[2]!.length;

    colorInfos.push({
      color: Color.create(r / 31, g / 31, b / 31, 1),
      range: Range.create(doc.positionAt(valueStart), doc.positionAt(valueEnd)),
    });
  }

  return colorInfos;
}

function color24Presentation(params: ColorPresentationParams): ColorPresentation[] {
  const r = Math.round(params.color.red * 255);
  const g = Math.round(params.color.green * 255);
  const b = Math.round(params.color.blue * 255);
  const rgb = (r << 16) | (g << 8) | b;

  return [
    {
      label: "Color Picker",
      textEdit: TextEdit.replace(params.range, "0x" + rgb.toString(16).toUpperCase().padStart(6, "0")),
    },
  ];
}

function recolorPresentation(params: ColorPresentationParams): ColorPresentation[] {
  const r = Math.round(params.color.red * 31);
  const g = Math.round(params.color.green * 31);
  const b = Math.round(params.color.blue * 31);
  const rgb = (r << 10) | (g << 5) | b;

  return [
    {
      label: "Model Recolor",
      textEdit: TextEdit.replace(params.range, rgb.toString()),
    },
  ];
}
