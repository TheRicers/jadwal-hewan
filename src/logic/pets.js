function deletePet(pets, schedules, petId) {
  const removed = schedules.filter((schedule) => schedule.petId === petId);
  return {
    pets: pets.filter((pet) => pet.id !== petId),
    schedules: schedules.filter((schedule) => schedule.petId !== petId),
    removed,
  };
}

module.exports = { deletePet };
