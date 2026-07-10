declare module 'svg-to-pdfkit' {
  import type PDFDocument from 'pdfkit'
  function SVGtoPDF(
    doc:  InstanceType<typeof PDFDocument>,
    svg:  string,
    x:    number,
    y:    number,
    opts?: {
      width?:               number
      height?:              number
      preserveAspectRatio?: string
      useCSS?:              boolean
      fontCallback?:        (family: string, bold: boolean, italic: boolean) => string
      imageCallback?:       (link: string) => string
      colorCallback?:       (rgb: [number, number, number], a: number) => [[number, number, number], number]
      warningCallback?:     (msg: string) => void
      assumePt?:            boolean
      precision?:           number
    },
  ): void
  export default SVGtoPDF
}
