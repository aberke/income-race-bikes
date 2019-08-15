/* Map things

*/

// TODO: maybe use options instead of checks
const redrawMapLayers = (previousYear=currentYear, year=currentYear, options) => {
	// The ordering of the map layers matters for both
	// aesthetics and clickability
	// Map layer order:
	// race, income, info, bikes

	removeRaceLayer(previousYear);
	if (raceCheck.checked)
		addRaceLayer(year);

	removeIncomeLayer(previousYear);
	if (incomeCheck.checked)
		addIncomeLayer(year);

	// Make the census tract info layer once (in setup)
	// then make sure it is always on top (but below bikes)
	redrawCensusTractInfoLayer();

	removeBikeStationLayer(year);
	if (bikeCheck.checked)
		addBikeStationLayer(previousYear, year);
}
