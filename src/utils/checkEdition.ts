import { AppError } from "./appError";
import { ErrorCode } from "./errorCodes";

export function checkEdition(editionParam: string | undefined) {
  const currentEdition = process.env.EDITION ? parseInt(process.env.EDITION) : null;
  if (!currentEdition) {
    throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
  }

  const edition = editionParam ?? process.env.EDITION;
  const editionStart = process.env.EDITION_START;

  if (!edition) {
    throw new AppError("Campo obrigatório ausente", 400, ErrorCode.MISSING_REQUIRED_FIELD);
  }

  if (!editionStart) {
    throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
  }

  return {
    currentEdition: currentEdition,
    edition: parseInt(edition),
    editionStart: parseInt(editionStart),
  };
}
