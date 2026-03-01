const PageHeader = ({ title, description, action }: { title: string , description: React.ReactNode, action?: React.ReactNode }) => {

    return <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="mb-1 font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--color-text)]">
          {title}
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          {description}
        </p>
      </div>    
     {action}
    </div>};

const PageLayout = ({ children,title, description, headerAction }: { children: React.ReactNode ,title: string , description: React.ReactNode, headerAction?: React.ReactNode }) => {
  return <div className="flex flex-col min-h-screen">
    <PageHeader title={title} description={description} action={headerAction} />
   
    {children}
  </div>;
};

export default PageLayout;