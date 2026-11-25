// Metro bundles .riv files as assets; this keeps TypeScript happy about require() of one.
declare module "*.riv" {
  const asset: number;
  export default asset;
}
