export const getPasswordResetEmailTemplate = (resetUrl: string) => `
<!doctype html>
<html>
  <body>
    <div
      style='background-color:#D4D4D4;color:#242424;font-family:ui-rounded, "Hiragino Maru Gothic ProN", Quicksand, Comfortaa, Manjari, "Arial Rounded MT Bold", Calibri, source-sans-pro, sans-serif;font-size:16px;font-weight:400;letter-spacing:0.15008px;line-height:1.5;margin:0;padding:32px 0;min-height:100%;width:100%'
    >
      <table
        align="center"
        width="100%"
        style="margin:0 auto;max-width:600px;background-color:#FFFFFF"
        role="presentation"
        cellspacing="0"
        cellpadding="0"
        border="0"
      >
        <tbody>
          <tr style="width:100%">
            <td>
              <div style="background-color:#19235a;padding:0px 0px 0px 0px">
                <table
                  align="center"
                  width="100%"
                  cellpadding="0"
                  border="0"
                  style="table-layout:fixed;border-collapse:collapse"
                >
                  <tbody style="width:100%">
                    <tr style="width:100%">
                      <td
                        style="box-sizing:content-box;vertical-align:middle;padding-left:0;padding-right:0;width:100px"
                      >
                        <div style="padding:8px 8px 8px 8px;text-align:center">
                          <a
                            href="https://bolaocopa.omegafox.me/"
                            style="text-decoration:none"
                            target="_blank"
                            ><img
                              alt="Link Bolão da Copa"
                              src="https://assets.omegafox.me/copa/misc/taca.png"
                              height="60"
                              style="height:60px;outline:none;border:none;text-decoration:none;vertical-align:middle;display:inline-block;max-width:100%"
                          /></a>
                        </div>
                      </td>
                      <td
                        style="box-sizing:content-box;vertical-align:middle;padding-left:0;padding-right:0"
                      >
                        <div
                          style="color:#f4b303;font-size:24px;font-weight:bold;text-align:left;padding:0px 0px 0px 0px"
                        >
                          Bolão da Copa 2026
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div style="background-color:#2b5f39;padding:0px 0px 0px 0px">
                <div style="height:16px"></div>
              </div>
              <div style="background-color:#f4b303;padding:0px 24px 0px 24px">
                <div style="height:8px"></div>
              </div>
              <h3
                style="color:#284ea0;font-weight:bold;margin:0;font-size:20px;padding:16px 24px 16px 24px"
              >
                Olá,
              </h3>
              <div style="font-weight:normal;padding:0px 24px 16px 24px">
                Se você solicitou a redefinição da sua senha, clique no botão
                abaixo:
              </div>
              <div style="padding:16px 24px 16px 24px">
                <a
                  href="${resetUrl}"
                  style="color:#FFFFFF;font-size:16px;font-weight:bold;background-color:#284ea0;border-radius:4px;display:inline-block;padding:12px 20px;text-decoration:none"
                  target="_blank"
                  ><span
                    ><!--[if mso
                      ]><i
                        style="letter-spacing: 20px;mso-font-width:-100%;mso-text-raise:30"
                        hidden
                        >&nbsp;</i
                      ><!
                    [endif]--></span
                  ><span>Redefinir Senha</span
                  ><span
                    ><!--[if mso
                      ]><i
                        style="letter-spacing: 20px;mso-font-width:-100%"
                        hidden
                        >&nbsp;</i
                      ><!
                    [endif]--></span
                  ></a
                >
              </div>
              <div style="font-weight:normal;padding:16px 24px 0px 24px">
                Ou, se preferir, copie e cole o link abaixo no seu navegador:
              </div>
              <div style="font-weight:normal;padding:0px 24px 0px 24px">
                ${resetUrl}
              </div>
              <div style="font-weight:normal;padding:16px 24px 16px 24px">
                Esse link expira em 1 hora.
              </div>
              <div style="padding:16px 0px 16px 0px">
                <hr
                  style="width:100%;border:none;border-top:1px solid #CCCCCC;margin:0"
                />
              </div>
              <div style="font-weight:normal;padding:16px 24px 0px 24px">
                Se você não solicitou a redefinição da sua senha, por favor
                ignore este e-mail.
              </div>
              <div style="font-weight:normal;padding:0px 24px 16px 24px">
                Sua senha permanecerá inalterada.
              </div>
              <div style="padding:0px 0px 0px 0px">
                <a
                  href="https://bolaocopa.omegafox.me/"
                  style="text-decoration:none"
                  target="_blank"
                  ><img
                    alt="Illustration"
                    src="https://assets.omegafox.me/copa/misc/email-footer.png"
                    style="outline:none;border:none;text-decoration:none;vertical-align:middle;display:inline-block;max-width:100%"
                /></a>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </body>
</html>
`;

// JSON TEMPLATE - Built with https://usewaypoint.github.io/email-builder-js/
/*
{
  "root": {
    "type": "EmailLayout",
    "data": {
      "backdropColor": "#D4D4D4",
      "canvasColor": "#FFFFFF",
      "textColor": "#242424",
      "fontFamily": "ROUNDED_SANS",
      "childrenIds": [
        "block-1778749336271",
        "block-1778749600734",
        "block-1778752422151",
        "block-1778749724759",
        "block-1709571234315",
        "block-1778751418712",
        "block-1778751472183",
        "block-1778751489370",
        "block-1709571247550",
        "block-1778749712842",
        "block-1778750450515",
        "block-1778751596590",
        "block-1709571282795"
      ]
    }
  },
  "block-1709571234315": {
    "type": "Text",
    "data": {
      "style": {
        "fontWeight": "normal",
        "padding": {
          "top": 0,
          "bottom": 16,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "text": "Se você solicitou a redefinição da sua senha, clique no botão abaixo:\n\n"
      }
    }
  },
  "block-1709571247550": {
    "type": "Text",
    "data": {
      "style": {
        "fontWeight": "normal",
        "padding": {
          "top": 16,
          "bottom": 16,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "text": "Esse link expira em 1 hora."
      }
    }
  },
  "block-1709571282795": {
    "type": "Image",
    "data": {
      "style": {
        "padding": {
          "top": 0,
          "bottom": 0,
          "right": 0,
          "left": 0
        }
      },
      "props": {
        "url": "https://sports.sbt.com.br/_next/image?url=https%3A%2F%2Fsbt-sports-assets-prod.s3.sa-east-1.amazonaws.com%2FCopa_do_Mundo_2026_comeca_em_junho_com_formato_inedito_e_48_selecoes_4bfcd02ef3.jpg&w=1920&q=90",
        "alt": "Illustration",
        "linkHref": "https://bolaocopa.omegafox.me/",
        "contentAlignment": "middle"
      }
    }
  },
  "block-1778749336271": {
    "type": "ColumnsContainer",
    "data": {
      "style": {
        "backgroundColor": "#19235a",
        "padding": {
          "top": 0,
          "bottom": 0,
          "right": 0,
          "left": 0
        }
      },
      "props": {
        "fixedWidths": [
          100,
          null,
          null
        ],
        "columnsCount": 2,
        "columnsGap": 0,
        "columns": [
          {
            "childrenIds": [
              "block-1778749339900"
            ]
          },
          {
            "childrenIds": [
              "block-1778749400358"
            ]
          },
          {
            "childrenIds": []
          }
        ]
      }
    }
  },
  "block-1778749339900": {
    "type": "Image",
    "data": {
      "style": {
        "padding": {
          "top": 8,
          "bottom": 8,
          "right": 8,
          "left": 8
        },
        "textAlign": "center"
      },
      "props": {
        "height": 60,
        "url": "https://assets.omegafox.me/copa/misc/taca.png",
        "alt": "Link Bolão da Copa",
        "linkHref": "https://bolaocopa.omegafox.me/",
        "contentAlignment": "middle"
      }
    }
  },
  "block-1778749400358": {
    "type": "Text",
    "data": {
      "style": {
        "color": "#f4b303",
        "fontSize": 24,
        "fontWeight": "bold",
        "textAlign": "left",
        "padding": {
          "top": 0,
          "bottom": 0,
          "right": 0,
          "left": 0
        }
      },
      "props": {
        "text": "Bolão da Copa 2026"
      }
    }
  },
  "block-1778749600734": {
    "type": "Container",
    "data": {
      "style": {
        "backgroundColor": "#2b5f39",
        "padding": {
          "top": 0,
          "bottom": 0,
          "right": 0,
          "left": 0
        }
      },
      "props": {
        "childrenIds": [
          "block-1778749660642"
        ]
      }
    }
  },
  "block-1778749660642": {
    "type": "Spacer",
    "data": {}
  },
  "block-1778749712842": {
    "type": "Divider",
    "data": {
      "style": {
        "padding": {
          "top": 16,
          "bottom": 16,
          "right": 0,
          "left": 0
        }
      },
      "props": {
        "lineColor": "#CCCCCC"
      }
    }
  },
  "block-1778749724759": {
    "type": "Heading",
    "data": {
      "props": {
        "text": "Olá,",
        "level": "h3"
      },
      "style": {
        "color": "#284ea0",
        "padding": {
          "top": 16,
          "bottom": 16,
          "right": 24,
          "left": 24
        }
      }
    }
  },
  "block-1778750450515": {
    "type": "Text",
    "data": {
      "style": {
        "fontWeight": "normal",
        "padding": {
          "top": 16,
          "bottom": 0,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "text": "Se você não solicitou a redefinição da sua senha, por favor ignore este e-mail."
      }
    }
  },
  "block-1778750521811": {
    "type": "Button",
    "data": {
      "style": {
        "textAlign": "center",
        "padding": {
          "top": 16,
          "bottom": 16,
          "right": 0,
          "left": 0
        }
      },
      "props": {
        "buttonBackgroundColor": "#284ea0",
        "size": "small",
        "text": "Apostar",
        "url": "https://bolaocopa.omegafox.me/partidas"
      }
    }
  },
  "block-1778750523713": {
    "type": "Button",
    "data": {
      "style": {
        "textAlign": "center",
        "padding": {
          "top": 16,
          "bottom": 16,
          "right": 0,
          "left": 0
        }
      },
      "props": {
        "buttonBackgroundColor": "#284ea0",
        "size": "small",
        "text": "Extras",
        "url": "https://bolaocopa.omegafox.me/extras"
      }
    }
  },
  "block-1778750524886": {
    "type": "Button",
    "data": {
      "style": {
        "textAlign": "center",
        "padding": {
          "top": 16,
          "bottom": 16,
          "right": 0,
          "left": 0
        }
      },
      "props": {
        "buttonBackgroundColor": "#284ea0",
        "size": "small",
        "text": "Regras",
        "url": "https://bolaocopa.omegafox.me/regras"
      }
    }
  },
  "block-1778751418712": {
    "type": "Button",
    "data": {
      "style": {
        "padding": {
          "top": 16,
          "bottom": 16,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "buttonBackgroundColor": "#284ea0",
        "text": "Redefinir Senha",
        "url": "<<insira aqui URL>>"
      }
    }
  },
  "block-1778751472183": {
    "type": "Text",
    "data": {
      "style": {
        "fontWeight": "normal",
        "padding": {
          "top": 16,
          "bottom": 0,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "text": "Ou, se preferir, copie e cole o link abaixo no seu navegador:\n\n"
      }
    }
  },
  "block-1778751489370": {
    "type": "Text",
    "data": {
      "style": {
        "fontWeight": "normal",
        "padding": {
          "top": 0,
          "bottom": 0,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "text": "<<insira aqui URL>>"
      }
    }
  },
  "block-1778751596590": {
    "type": "Text",
    "data": {
      "style": {
        "fontWeight": "normal",
        "padding": {
          "top": 0,
          "bottom": 16,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "text": "Sua senha permanecerá inalterada.\n\n"
      }
    }
  },
  "block-1778752422151": {
    "type": "Container",
    "data": {
      "style": {
        "backgroundColor": "#f4b303",
        "padding": {
          "top": 0,
          "bottom": 0,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "childrenIds": [
          "block-1778752435807"
        ]
      }
    }
  },
  "block-1778752435807": {
    "type": "Spacer",
    "data": {
      "props": {
        "height": 8
      }
    }
  }
}
*/
