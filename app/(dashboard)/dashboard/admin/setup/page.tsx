import { redirect } from "next/navigation";
import { WorkspaceRole } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/current-user";
import {
  DepartmentForm,
  DivisionForm,
  OfficeForm,
  PositionForm,
  UnitForm,
} from "./setup-forms";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function OrganizationSetupPage() {
  const user = await requireCurrentUser();

  if (user.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) {
    redirect("/dashboard");
  }

  const [offices, departments, divisions, units, positions] = await Promise.all([
    prisma.office.findMany({ orderBy: { name: "asc" } }),
    prisma.department.findMany({
      include: { office: true },
      orderBy: { name: "asc" },
    }),
    prisma.division.findMany({
      include: { department: true },
      orderBy: { name: "asc" },
    }),
    prisma.unit.findMany({
      include: { division: true },
      orderBy: { name: "asc" },
    }),
    prisma.position.findMany({ orderBy: { title: "asc" } }),
  ]);

  const officeOptions = offices.map(({ id, name, code }) => ({ id, name, code }));
  const departmentOptions = departments.map(({ id, name, code }) => ({
    id,
    name,
    code,
  }));
  const divisionOptions = divisions.map(({ id, name, code }) => ({
    id,
    name,
    code,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Organization Setup
        </h1>
        <p className="mt-2 text-muted-foreground">
          Manage reference data required for user onboarding and access control.
        </p>
      </div>

      <Tabs defaultValue="offices">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="offices">Offices</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="divisions">Divisions</TabsTrigger>
          <TabsTrigger value="units">Units</TabsTrigger>
          <TabsTrigger value="positions">Positions</TabsTrigger>
        </TabsList>

        <TabsContent value="offices" className="mt-6">
          <Grid>
            <SetupCard title="Create Office">
              <OfficeForm />
            </SetupCard>

            <SetupCard title="Offices">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offices.map((office) => (
                    <TableRow key={office.id}>
                      <TableCell>{office.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{office.code}</Badge>
                      </TableCell>
                      <TableCell>{office.type}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </SetupCard>
          </Grid>
        </TabsContent>

        <TabsContent value="departments" className="mt-6">
          <Grid>
            <SetupCard title="Create Department">
              <DepartmentForm offices={officeOptions} />
            </SetupCard>

            <SetupCard title="Departments">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Office</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((department) => (
                    <TableRow key={department.id}>
                      <TableCell>{department.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{department.code}</Badge>
                      </TableCell>
                      <TableCell>{department.office?.name ?? "N/A"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </SetupCard>
          </Grid>
        </TabsContent>

        <TabsContent value="divisions" className="mt-6">
          <Grid>
            <SetupCard title="Create Division">
              <DivisionForm departments={departmentOptions} />
            </SetupCard>

            <SetupCard title="Divisions">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Department</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {divisions.map((division) => (
                    <TableRow key={division.id}>
                      <TableCell>{division.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{division.code}</Badge>
                      </TableCell>
                      <TableCell>{division.department.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </SetupCard>
          </Grid>
        </TabsContent>

        <TabsContent value="units" className="mt-6">
          <Grid>
            <SetupCard title="Create Unit">
              <UnitForm divisions={divisionOptions} />
            </SetupCard>

            <SetupCard title="Units">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Division</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.map((unit) => (
                    <TableRow key={unit.id}>
                      <TableCell>{unit.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{unit.code}</Badge>
                      </TableCell>
                      <TableCell>{unit.division?.name ?? "N/A"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </SetupCard>
          </Grid>
        </TabsContent>

        <TabsContent value="positions" className="mt-6">
          <Grid>
            <SetupCard title="Create Position">
              <PositionForm />
            </SetupCard>

            <SetupCard title="Positions">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Code</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map((position) => (
                    <TableRow key={position.id}>
                      <TableCell>{position.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{position.code}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </SetupCard>
          </Grid>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-6 xl:grid-cols-[420px_1fr]">{children}</div>;
}

function SetupCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
