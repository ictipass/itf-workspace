import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import SetupRecordStatusButton from "./setup-record-status-button";
import SetupRecordEditDialog from "./setup-record-edit-dialog";

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

  const activeOffices = offices.filter((item) => item.isActive);
  const activeDepartments = departments.filter((item) => item.isActive);
  const activeDivisions = divisions.filter((item) => item.isActive);

  return (
    <>
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Organization Setup
        </h1>
        <p className="mt-2 text-muted-foreground">
          Manage reference data required for user onboarding and access control.
        </p>
      </div>

      <Button asChild variant="outline">
        <Link href="/api/admin/setup/reference-codes">
          Download Reference Codes
        </Link>
      </Button>
    </div>

    <div>
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
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                      <TableCell>
                        <Badge variant={office.isActive ? "default" : "secondary"}>
                          {office.isActive ? "ACTIVE" : "INACTIVE"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                        <SetupRecordEditDialog
                          id={office.id}
                          entity="office"
                          code={office.code}
                          displayName={office.name}
                        />
                        <SetupRecordStatusButton
                          id={office.id}
                          entity="office"
                          isActive={office.isActive}
                        />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </SetupCard>
          </Grid>
        </TabsContent>

        <TabsContent value="departments" className="mt-6">
          <Grid>
            <SetupCard title="Create Department">
              <DepartmentForm offices={activeOffices} />
            </SetupCard>

            <SetupCard title="Departments">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Office</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                      <TableCell>
                        <Badge variant={department.isActive ? "default" : "secondary"}>
                          {department.isActive ? "ACTIVE" : "INACTIVE"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                        <SetupRecordEditDialog
                          id={department.id}
                          entity="department"
                          code={department.code}
                          displayName={department.name}
                        />
                        <SetupRecordStatusButton
                          id={department.id}
                          entity="department"
                          isActive={department.isActive}
                        />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </SetupCard>
          </Grid>
        </TabsContent>

        <TabsContent value="divisions" className="mt-6">
          <Grid>
            <SetupCard title="Create Division">
              <DivisionForm departments={activeDepartments} />
            </SetupCard>

            <SetupCard title="Divisions">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                      <TableCell>
                        <Badge variant={division.isActive ? "default" : "secondary"}>
                          {division.isActive ? "ACTIVE" : "INACTIVE"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                        <SetupRecordEditDialog
                          id={division.id}
                          entity="division"
                          code={division.code}
                          displayName={division.name}
                        />
                        <SetupRecordStatusButton
                          id={division.id}
                          entity="division"
                          isActive={division.isActive}
                        />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </SetupCard>
          </Grid>
        </TabsContent>

        <TabsContent value="units" className="mt-6">
          <Grid>
            <SetupCard title="Create Unit">
              <UnitForm divisions={activeDivisions} />
            </SetupCard>

            <SetupCard title="Units">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Division</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                      <TableCell>
                        <Badge variant={unit.isActive ? "default" : "secondary"}>
                          {unit.isActive ? "ACTIVE" : "INACTIVE"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                        <SetupRecordEditDialog
                          id={unit.id}
                          entity="unit"
                          code={unit.code}
                          displayName={unit.name}
                        />
                        <SetupRecordStatusButton
                          id={unit.id}
                          entity="unit"
                          isActive={unit.isActive}
                        />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </SetupCard>
          </Grid>
        </TabsContent>

        <TabsContent value="positions" className="mt-6">
          <Grid>
            <SetupCard title="Create Position">
              <PositionForm />
            </SetupCard>

            <SetupCard title="Positions">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map((position) => (
                    <TableRow key={position.id}>
                      <TableCell>{position.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{position.code}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={position.isActive ? "default" : "secondary"}>
                          {position.isActive ? "ACTIVE" : "INACTIVE"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                        <SetupRecordEditDialog
                          id={position.id}
                          entity="position"
                          code={position.code}
                          displayName={position.title}
                        />
                        <SetupRecordStatusButton
                          id={position.id}
                          entity="position"
                          isActive={position.isActive}
                        />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </SetupCard>
          </Grid>
        </TabsContent>
      </Tabs>
    </div>
    </>
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
