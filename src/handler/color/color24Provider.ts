import { Color, ColorInformation, ColorPresentation, ColorPresentationParams, DocumentColorParams, Range, TextEdit } from "vscode-languageserver";
import { getDocuments } from "../../utils/documentUtils.js";
import { COLOR24_REGEX } from "../../resource/enum/regex.js";

export function color24Provider(params: DocumentColorParams): ColorInformation[] {
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

export function color24Presentation(params: ColorPresentationParams): ColorPresentation[] {
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
