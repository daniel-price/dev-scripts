import { describe, expect, it } from "bun:test";

import { formatInput } from "./format";

describe("formatInput", () => {
  it("formats a GraphQL mutation", async () => {
    const input =
      'mutation createSiteAppointmentType {\n      createSiteAppointmentType(new_item:{\n  appointment_type_id:"zZZtxIDdU7_S"\n  site_id:"14c5bffc-d65a-4769-9aff-2c7108c13acc"\n  is_enabled:false\n  use_free_time:true\n  deposit:null\n  price:1000\n  duration:30\n  bookable_sessions:[]\n  practitioner_durations:[{practitioner_id:"31" overridden_duration:null},{practitioner_id:"232202" overridden_duration:null}]}) { id }\n    }';

    const expected = `mutation createSiteAppointmentType {
  createSiteAppointmentType(
    new_item: {
      appointment_type_id: "zZZtxIDdU7_S"
      site_id: "14c5bffc-d65a-4769-9aff-2c7108c13acc"
      is_enabled: false
      use_free_time: true
      deposit: null
      price: 1000
      duration: 30
      bookable_sessions: []
      practitioner_durations: [
        { practitioner_id: "31", overridden_duration: null }
        { practitioner_id: "232202", overridden_duration: null }
      ]
    }
  ) {
    id
  }
}
`;

    expect(await formatInput(input)).toBe(expected);
  });
});
