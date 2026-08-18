export type StaticSemanticRoleViolation = {
  role: string;
  line: number;
};

export type FormalPrototypeStaticRoleViolation = StaticSemanticRoleViolation & {
  file: string;
};

export function findInvalidStaticSemanticRoles(
  source: string,
  allowedRoles?: readonly string[],
): StaticSemanticRoleViolation[];

export function lintFormalPrototypeStaticRoles(): Promise<
  FormalPrototypeStaticRoleViolation[]
>;
