Improved documentation (links)

New Relic champion for Maverick

Picked up new language/technology (Rails)

Unblocking critical issues blocking release.

DevOps:

- Package manager migration from npm to pnpm to improve dependency management security - https://github.com/dentally/dentr/pull/8610
- Implemented pipeline safety guardrails preventing accidental deployments to wrong AWS accounts - https://github.com/dentally/dentr/pull/8193
-

Testing & Quality Assurance:

- Drove increasing e2e and integration test reliability

  - https://github.com/dentally/dentr/pull/8166
  - https://github.com/dentally/dentr/pull/8131
  - https://github.com/dentally/dentr/pull/8606
  - https://github.com/dentally/dentr/pull/8085
  - https://github.com/dentally/dentr/pull/8287

- Drove coverage of e2e tests while decreasing number of tests by regular analysis with Pam - identiied areas lacking coverage
- Implemented e2e tests for kiosk functionality https://github.com/dentally/dentr/pull/8294, https://github.com/dentally/dentr/pull/8425
- add e2e test for task reminder sending https://github.com/dentally/dentr/pull/7696
- add e2e test to check held appointment functionality https://github.com/dentally/dentr/pull/7657
- add e2e test for multiple patient short codes on same device https://github.com/dentally/dentr/pull/8070

DevEx:

- ensured consistent formatting across entire codebase https://github.com/dentally/dentr/pull/7680
- added automated checking to prevent specific issues: http://github.com/dentally/dentr/pull/7958, https://github.com/dentally/dentr/pull/8090
- improvement to DX - automatically update security group to include IP if ssh times out - https://github.com/dentally/dentr/pull/7940
- automated checking of PR titles to ensure all PRs are properly linked to tickets for better project tracking - https://github.com/dentally/dentr/pull/7667
- Deprecated legacy services, cleaning up technical debt and guiding team toward better patterns - https://github.com/dentally/dentr/pull/7689

Debugging and fixing produciton errors:

- significantly sped up timing out graph query (>30s to <7s) https://github.com/dentally/dentr/pull/8608
  • **Fixed critical booking flow edge case** ([#7644](https://github.com/dentally/dentr/pull/7644)) preventing deposits from being taken without appointment booking - directly protecting revenue

Reduced infra cost and complexity:

- migrating from Timestream to Mixpanel for dashboards https://github.com/dentally/dentr/pull/8451
