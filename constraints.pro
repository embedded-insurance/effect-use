requires_specific_version(DependencyIdent,  Version) :-
    (DependencyIdent, Version) = ('@temporalio/activity', '1.8.6');
    (DependencyIdent, Version) = ('@temporalio/worker', '1.8.6');
    (DependencyIdent, Version) = ('@temporalio/workflow', '1.8.6');
    (DependencyIdent, Version) = ('@temporalio/client', '1.8.6');

    (DependencyIdent, Version) = ('effect', '3.12.1');

    (DependencyIdent, Version) = ('typescript', '5.7.2');
    (DependencyIdent, Version) = ('prettier', '2.8.8');

    (DependencyIdent, Version) = ('jest', '29.5.0');
    (DependencyIdent, Version) = ('ts-jest', '29.1.0').


gen_enforced_dependency(WorkspaceCwd, DependencyIdent, DependencyRange2, DependencyType) :-
  workspace_has_dependency(WorkspaceCwd, DependencyIdent, DependencyRange, DependencyType),
  requires_specific_version(DependencyIdent,DependencyRange2).


gen_enforced_field(WorkspaceCwd, 'main', 'dist/index.js').
gen_enforced_field(WorkspaceCwd, 'engines.node', '>=18').
gen_enforced_field(WorkspaceCwd, 'license', 'MIT').
gen_enforced_field(WorkspaceCwd, 'repository.type', 'git').
gen_enforced_field(WorkspaceCwd, 'repository.url', 'https://github.com/embedded-insurance/effect-use.git').
gen_enforced_field(WorkspaceCwd, 'repository.directory', WorkspaceCwd).
gen_enforced_field(WorkspaceCwd, 'publishConfig.access', 'public').
gen_enforced_field(WorkspaceCwd, 'scripts.format', 'prettier --write .') :- WorkspaceCwd \= '.'.
gen_enforced_field(WorkspaceCwd, 'scripts.clean', 'rimraf node_modules & rimraf dist & rimraf .turbo') :- WorkspaceCwd \= '.'.
gen_enforced_field(WorkspaceCwd, 'scripts.build', 'rimraf dist && tsc -p tsconfig.build.json') :- WorkspaceCwd \= '.'.
gen_enforced_field(WorkspaceCwd, 'scripts.typecheck', 'tsc --noEmit') :- WorkspaceCwd \= '.'.

% workspace_cwd_dirname(WorkspaceCwd, Dirname) :-
%    split_atom(WorkspaceCwd, '/', '', XS),
%    [_, Dirname].

% <folder-name> in 'packages/<folder-name>'
workspace_cwd_dirname(WorkspaceCwd, Dirname) :-
   atomic_list_concat(['packages', Dirname], '/', WorkspaceCwd).

% Folders in "packages" have a package name "@effect-use/<folder-name>"
gen_enforced_field(WorkspaceCwd, 'name', PackageName) :-
    % not the monorepo root
    WorkspaceCwd \= '.',
    % package name and folder name must match
    workspace_cwd_dirname(WorkspaceCwd, Dirname),
    atom_concat('@effect-use/', Dirname, PackageName).


