import { Color, ColorInformation, ColorPresentation, ColorPresentationParams, DocumentColorParams, Range, TextEdit } from "vscode-languageserver";
import { RECOLOR_REGEX } from "../../resource/enum/regex.js";
import { getDocuments } from "../../utils/documentUtils.js";

export function recolorProvider(params: DocumentColorParams): ColorInformation[] {
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

export function recolorPresentation(params: ColorPresentationParams): ColorPresentation[] {
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
